import fs from 'fs';
import path from 'path';
import type { DesktopDisplayInfo } from './desktopTypes';

export interface LogFsOps {
  mkdirSync: (dirPath: string, options?: { recursive?: boolean }) => unknown;
  appendFileSync: (filePath: string, data: string, encoding?: BufferEncoding) => void;
}

const DEFAULT_LOG_FS_OPS: LogFsOps = {
  mkdirSync: (dirPath, options) => fs.mkdirSync(dirPath, options),
  appendFileSync: (filePath, data, encoding = 'utf8') =>
    fs.appendFileSync(filePath, data, encoding),
};

export function formatDesktopLogEntry(
  event: string,
  meta: Record<string, unknown> = {},
  now: Date = new Date()
): string {
  let serializedMeta = '{}';
  try {
    serializedMeta = JSON.stringify(meta);
  } catch {
    serializedMeta = JSON.stringify({ note: 'unserializable metadata' });
  }
  return `[${now.toISOString()}] [${event}] ${serializedMeta}\n`;
}

export function ensureDirectoryAndAppendLog(
  logPath: string,
  line: string,
  fsOps: LogFsOps = DEFAULT_LOG_FS_OPS
): boolean {
  try {
    fsOps.mkdirSync(path.dirname(logPath), { recursive: true });
    fsOps.appendFileSync(logPath, line, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export type IsolationModeValue = '0' | '1' | '2' | '3' | '4';

export function normalizeIsolationMode(rawValue?: string | null): IsolationModeValue {
  const trimmed = (rawValue ?? '').trim();
  if (
    trimmed === '0' ||
    trimmed === '1' ||
    trimmed === '2' ||
    trimmed === '3' ||
    trimmed === '4'
  ) {
    return trimmed;
  }
  return '4';
}

export interface StudioStartupDecision {
  shouldLaunch: boolean;
  normalizedIsolationMode: IsolationModeValue;
  reason: string;
}

export function evaluateStudioStartupDecision(
  argv: string[],
  rawIsolationMode: string | null | undefined = '4'
): StudioStartupDecision {
  const normalizedIsolationMode = normalizeIsolationMode(rawIsolationMode);
  if (normalizedIsolationMode === '0') {
    return {
      shouldLaunch: false,
      normalizedIsolationMode,
      reason: 'isolation_mode_0',
    };
  }
  const normalizedFlags = argv.map((arg) => arg.trim().toLowerCase());
  if (normalizedFlags.includes('--background')) {
    return {
      shouldLaunch: false,
      normalizedIsolationMode,
      reason: 'flag_background',
    };
  }
  if (normalizedFlags.includes('--tray-only')) {
    return {
      shouldLaunch: false,
      normalizedIsolationMode,
      reason: 'flag_tray_only',
    };
  }
  return {
    shouldLaunch: true,
    normalizedIsolationMode,
    reason: 'normal_launch',
  };
}

export function shouldLaunchMainStudioWindow(
  argv: string[],
  isolationMode: string = '4'
): boolean {
  return evaluateStudioStartupDecision(argv, isolationMode).shouldLaunch;
}

export function shouldLaunchOverlayWindow(rawIsolationMode?: string | null): boolean {
  const mode = normalizeIsolationMode(rawIsolationMode);
  return mode === '3' || mode === '4';
}

export function shouldLaunchFloatingToolbar(rawIsolationMode?: string | null): boolean {
  const mode = normalizeIsolationMode(rawIsolationMode);
  return mode === '2' || mode === '4';
}

export interface WindowBoundsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computePrimaryWindowBounds(
  displays: DesktopDisplayInfo[],
  preferredWidth: number = 980,
  preferredHeight: number = 680
): WindowBoundsRect {
  const safePrefW = Math.max(480, Math.round(preferredWidth));
  const safePrefH = Math.max(420, Math.round(preferredHeight));

  if (!displays || displays.length === 0) {
    return {
      x: 120,
      y: 80,
      width: safePrefW,
      height: safePrefH,
    };
  }

  const primary = displays.find((d) => d.isPrimary) || displays[0];
  const area = primary.workArea || primary.bounds;
  const availW = Math.max(320, Math.round(area.width || 1280));
  const availH = Math.max(320, Math.round(area.height || 720));

  const width = Math.min(safePrefW, Math.max(320, availW - 40));
  const height = Math.min(safePrefH, Math.max(320, availH - 40));

  const x = Math.round(area.x + Math.max(0, (availW - width) / 2));
  const y = Math.round(area.y + Math.max(0, (availH - height) / 2));

  return { x, y, width, height };
}

export interface ChromiumSwitchSpec {
  name: string;
  value?: string;
}

/**
 * Production Chromium switches that preserve background screen capture reliability
 * without enabling experimental GPU/hardware-overlay flags that can break DWM
 * window composition or cause blank/terminated renderers on Windows drivers.
 */
export function resolveProductionChromiumSwitches(): ChromiumSwitchSpec[] {
  return [
    { name: 'disable-features', value: 'CalculateNativeWinOcclusion' },
    { name: 'enable-features', value: 'MediaFoundationVideoEncoder' },
    { name: 'disable-background-timer-throttling' },
    { name: 'disable-renderer-backgrounding' },
  ];
}

export interface StartupWindowHealthInput {
  mainWindowCreated: boolean;
  toolbarWindowCreated: boolean;
  overlayWindowCreated: boolean;
}

export function evaluateStartupWindowHealth(input: StartupWindowHealthInput): {
  healthy: boolean;
  reason?: string;
} {
  if (!input.mainWindowCreated && !input.toolbarWindowCreated) {
    return {
      healthy: false,
      reason:
        'Neither the ProScreen Studio window nor the floating toolbar window could be created.',
    };
  }
  return { healthy: true };
}
