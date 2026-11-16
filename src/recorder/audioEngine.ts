export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
  groupId?: string;
}

export interface MicAudioMeterData {
  level: number; // 0 to 1 linear amplitude
  db: number; // -60 to 0 dBFS
  peak: number; // 0 to 1 peak level
  isClipping: boolean;
  isSilent: boolean;
}

/**
 * Enumerate available microphone devices with fallback naming.
 */
export async function enumerateAudioInputDevices(): Promise<AudioInputDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');
    return audioInputs.map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${index + 1}`,
      groupId: d.groupId,
    }));
  } catch {
    return [];
  }
}

/**
 * Subscribe to hardware microphone connection/disconnection events.
 */
export function subscribeAudioDeviceChanges(callback: () => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) {
    return () => {};
  }
  navigator.mediaDevices.addEventListener('devicechange', callback);
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', callback);
  };
}

/**
 * Acquire studio-quality microphone stream with user-configured DSP processing.
 */
export async function acquireMicrophoneStream(opts: {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia is not supported in this environment.');
  }

  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: opts.echoCancellation ?? false,
    noiseSuppression: opts.noiseSuppression ?? false,
    autoGainControl: opts.autoGainControl ?? false,
    sampleRate: { ideal: 48000 },
    channelCount: { ideal: 2 },
  };

  if (opts.deviceId && opts.deviceId !== 'default') {
    audioConstraints.deviceId = { exact: opts.deviceId };
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
  } catch (err) {
    // If exact deviceId failed (e.g. unplugged), fallback to default microphone
    if (opts.deviceId && opts.deviceId !== 'default') {
      const fallbackConstraints: MediaTrackConstraints = {
        ...audioConstraints,
        deviceId: undefined,
      };
      return await navigator.mediaDevices.getUserMedia({ audio: fallbackConstraints });
    }
    throw err;
  }
}

/**
 * Studio Audio Mixer for combining desktop/tab audio and voice microphone.
 * Applies dedicated gain staging and a transparent dynamic compressor/limiter
 * to eliminate digital distortion and audio clipping.
 */
export class StudioAudioMixer {
  private audioCtx: AudioContext | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private tabSourceNode: MediaStreamAudioSourceNode | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private tabGainNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;
  private highPassNode: BiquadFilterNode | null = null;
  private voiceCompressorNode: DynamicsCompressorNode | null = null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;

  async init(opts: {
    tabStream?: MediaStream | null;
    micStream?: MediaStream | null;
    micGain?: number;
  }): Promise<MediaStreamTrack[]> {
    const hasTabAudio = (opts.tabStream?.getAudioTracks().length ?? 0) > 0;
    const hasMicAudio = (opts.micStream?.getAudioTracks().length ?? 0) > 0;

    if (!hasTabAudio && !hasMicAudio) {
      return [];
    }

    // If Web Audio API is unavailable, passthrough raw tracks
    if (typeof AudioContext === 'undefined') {
      return [
        ...(opts.micStream?.getAudioTracks() ?? []),
        ...(opts.tabStream?.getAudioTracks() ?? []),
      ];
    }

    // Pure tab audio with no microphone: passthrough directly without DSP latency
    if (hasTabAudio && !hasMicAudio && opts.tabStream) {
      return [...opts.tabStream.getAudioTracks()];
    }

    try {
      const AudioCtxClass =
        typeof AudioContext !== 'undefined'
          ? AudioContext
          : (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass({
        sampleRate: 48000,
        latencyHint: 'interactive',
      });
      this.audioCtx = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const destination = audioCtx.createMediaStreamDestination();
      this.destinationNode = destination;

      // Master Brickwall Peak Limiter (prevents digital clipping at master destination)
      const limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-1.0, audioCtx.currentTime); // -1.0 dBFS ceiling
      limiter.knee.setValueAtTime(0, audioCtx.currentTime); // Hard knee
      limiter.ratio.setValueAtTime(20, audioCtx.currentTime); // 20:1 brickwall limiting
      limiter.attack.setValueAtTime(0.002, audioCtx.currentTime); // 2ms peak catch
      limiter.release.setValueAtTime(0.08, audioCtx.currentTime); // 80ms smooth recovery
      limiter.connect(destination);
      this.masterLimiterNode = limiter;

      // Tab audio channel: full studio 1.0 unity gain
      if (opts.tabStream && hasTabAudio) {
        const tabSource = audioCtx.createMediaStreamSource(opts.tabStream);
        const tabGain = audioCtx.createGain();
        tabGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
        tabSource.connect(tabGain);
        tabGain.connect(limiter);
        this.tabSourceNode = tabSource;
        this.tabGainNode = tabGain;
      }

      // Voice microphone channel: 80Hz rumble filter + studio gain boost + dedicated voice leveler
      if (opts.micStream && hasMicAudio) {
        const micSource = audioCtx.createMediaStreamSource(opts.micStream);
        const micGain = audioCtx.createGain();
        const gainVal =
          typeof opts.micGain === 'number' && Number.isFinite(opts.micGain)
            ? opts.micGain
            : 1.0;
        micGain.gain.setValueAtTime(gainVal, audioCtx.currentTime);

        let micOutput: AudioNode = micSource;
        if (typeof audioCtx.createBiquadFilter === 'function') {
          const highPass = audioCtx.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.setValueAtTime(80, audioCtx.currentTime);
          if (highPass.Q) {
            highPass.Q.setValueAtTime(0.707, audioCtx.currentTime);
          }
          micSource.connect(highPass);
          this.highPassNode = highPass;
          micOutput = highPass;
        }

        // Dedicated voice leveling compressor (smooth, natural speech leveling without ducking from tab)
        const voiceComp = audioCtx.createDynamicsCompressor();
        voiceComp.threshold.setValueAtTime(-20, audioCtx.currentTime); // -20 dBFS
        voiceComp.knee.setValueAtTime(10, audioCtx.currentTime); // 10 dB soft knee
        voiceComp.ratio.setValueAtTime(2.5, audioCtx.currentTime); // 2.5:1 transparent compression
        voiceComp.attack.setValueAtTime(0.005, audioCtx.currentTime); // 5ms attack
        voiceComp.release.setValueAtTime(0.20, audioCtx.currentTime); // 200ms smooth release
        this.voiceCompressorNode = voiceComp;

        micOutput.connect(micGain);
        micGain.connect(voiceComp);
        voiceComp.connect(limiter);
        this.micSourceNode = micSource;
        this.micGainNode = micGain;
      }

      return [...destination.stream.getAudioTracks()];
    } catch {
      // Fallback in case Web Audio fails
      return [
        ...(opts.micStream?.getAudioTracks() ?? []),
        ...(opts.tabStream?.getAudioTracks() ?? []),
      ];
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.audioCtx && this.audioCtx.state === 'running') {
        await this.audioCtx.suspend();
      }
    } catch {
      // Ignore suspend errors
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch {
      // Ignore resume errors
    }
  }

  cleanup() {
    try {
      this.tabSourceNode?.disconnect();
      this.micSourceNode?.disconnect();
      this.highPassNode?.disconnect();
      this.tabGainNode?.disconnect();
      this.micGainNode?.disconnect();
      this.voiceCompressorNode?.disconnect();
      this.masterLimiterNode?.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    try {
      if (this.destinationNode) {
        this.destinationNode.stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      // Ignore track stop errors
    }

    try {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Ignore close errors
    }

    this.tabSourceNode = null;
    this.micSourceNode = null;
    this.highPassNode = null;
    this.tabGainNode = null;
    this.micGainNode = null;
    this.voiceCompressorNode = null;
    this.masterLimiterNode = null;
    this.destinationNode = null;
    this.audioCtx = null;
  }
}

/**
 * Real-time microphone audio monitor for live level metering,
 * clipping detection, and silence detection.
 */
export class MicAudioMonitor {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private monitorStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isOwnStream = false;
  private listener: ((data: MicAudioMeterData) => void) | null = null;

  async startMonitoring(
    streamOrDeviceId?: MediaStream | string,
    onMeterUpdate?: (data: MicAudioMeterData) => void
  ): Promise<boolean> {
    this.stop();
    this.listener = onMeterUpdate ?? null;

    if (typeof AudioContext === 'undefined') {
      return false;
    }

    try {
      let stream: MediaStream;
      if (streamOrDeviceId instanceof MediaStream) {
        stream = streamOrDeviceId;
        this.isOwnStream = false;
      } else {
        stream = await acquireMicrophoneStream({
          deviceId: typeof streamOrDeviceId === 'string' ? streamOrDeviceId : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        });
        this.isOwnStream = true;
      }

      this.monitorStream = stream;
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      this.audioCtx = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      this.analyser = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      this.source = source;

      this.runMeterLoop();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  private runMeterLoop = () => {
    if (!this.analyser || !this.listener) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < buffer.length; i++) {
      const absVal = Math.abs(buffer[i]);
      if (absVal > peak) peak = absVal;
      sumSquares += buffer[i] * buffer[i];
    }

    const rms = Math.sqrt(sumSquares / buffer.length);
    // Convert RMS to linear scale [0, 1] with gentle response
    const linearLevel = Math.min(1, Math.max(0, rms * 3.5));
    // Calculate dBFS (-60 dB to 0 dB)
    const db = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;

    const data: MicAudioMeterData = {
      level: linearLevel,
      db: Math.round(db),
      peak: Math.min(1, peak),
      isClipping: peak >= 0.95,
      isSilent: rms < 0.004,
    };

    this.listener(data);

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.runMeterLoop);
    }
  };

  stop() {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    try {
      this.source?.disconnect();
    } catch {
      // Ignore disconnect errors
    }

    if (this.isOwnStream && this.monitorStream) {
      try {
        this.monitorStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignore track stop errors
      }
    }

    try {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Ignore close errors
    }

    this.source = null;
    this.analyser = null;
    this.monitorStream = null;
    this.audioCtx = null;
    this.listener = null;
    this.isOwnStream = false;
  }
}
