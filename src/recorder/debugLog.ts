export function isRecorderDebugEnabled(): boolean {
  try {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean } })?.env;
    if (metaEnv?.DEV) return true;
  } catch {
    // Ignore when import.meta.env is unavailable
  }
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
  } catch {
    // Ignore when process is unavailable
  }
  try {
    if (
      typeof globalThis !== 'undefined' &&
      Boolean((globalThis as Record<string, unknown>).__PROSCREEN_DEBUG__)
    ) {
      return true;
    }
  } catch {
    // Ignore globalThis lookup errors
  }
  return false;
}

export function recDebugLog(stage: string, details?: Record<string, unknown>): void {
  if (!isRecorderDebugEnabled()) return;
  if (details) {
    console.debug(`[ProScreen:Recorder] ${stage}`, details);
  } else {
    console.debug(`[ProScreen:Recorder] ${stage}`);
  }
}
