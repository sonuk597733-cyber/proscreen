import {
  AnnotationItem,
  BoardMode,
  ExportedAnnotationBundle,
  HighlighterStyle,
  PenStyle,
  Point,
  SavedSession,
  ShapeToolType,
  TextAlign,
} from '../types/annotation';
import { UserSettings } from '../types/settings';
import { DEFAULT_SHORTCUTS } from '../shortcuts/shortcutManager';
import { clampTimerDurationMs, createDefaultTimerSettings } from '../canvas/timer';
import { isValidHex, normalizeHex } from '../utils/color';

export function createDefaultSettings(): UserSettings {
  return {
    schemaVersion: 1,
    theme: 'light',
    accentColor: '#0EA5E9',
    toolbarOrientation: 'vertical',
    toolbarSize: 'standard',
    toolbarPinned: false,
    toolbarCollapsed: false,
    toolbarMinimized: false,
    showTooltips: true,
    edgeSnapping: true,
    toolbarPosition: { x: 16, y: 76 },
    restoreButtonPosition: { x: 16, y: 76 },
    defaultTool: 'pointer',
    defaultBoardMode: 'webpage',
    whiteboardGrid: true,
    confirmBeforeClear: false,
    pen: {
      color: '#2563EB',
      thickness: 4,
      opacity: 1,
      penStyle: 'solid',
    },
    highlighter: {
      color: '#FACC15',
      thickness: 22,
      opacity: 0.42,
      highlighterStyle: 'soft',
    },
    eraserSize: 20,
    laserColor: '#EF4444',
    laserSize: 14,
    laserTrailEnabled: true,
    shape: {
      defaultShape: 'arrow',
      color: '#EF4444',
      fillColor: '#3B82F6',
      fillOpacity: 0.18,
      thickness: 3,
      opacity: 1,
      arrowHeadSize: 16,
    },
    text: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 22,
      bold: false,
      italic: false,
      align: 'left',
      color: '#0F172A',
      backgroundColor: '#FFFFFF',
    },
    creator: {
      creatorModeEnabled: false,
      ghostModeShortcutHint: true,
      cursorSpotlightEnabled: false,
      cursorHighlightEnabled: false,
      spotlightRadius: 150,
      spotlightDimOpacity: 0.62,
      fadingInkEnabled: false,
      fadingInkDurationMs: 3000,
      recordingFriendlyToolbar: false,
      annotationsVisible: true,
    },
    timer: createDefaultTimerSettings(),
    recording: {
      mode: 'tab',
      quality: 'high',
      resolution: '1080p',
      frameRate: 60,
      mimeType: 'auto',
      micAudio: false,
      tabAudio: true,
      micGain: 1.4,
      areaRect: null,
      videoBitrate: 'auto',
    },
    exportPrefs: {
      askWhereToSave: false,
    },
    recentColors: ['#2563EB', '#EF4444', '#FACC15', '#10B981', '#8B5CF6', '#0F172A'],
    favoriteColors: ['#2563EB', '#EF4444', '#FACC15', '#10B981'],
    shortcuts: DEFAULT_SHORTCUTS.map((s) => ({ ...s })),
    hasSeenOnboarding: false,
  };
}

const VALID_BOARD_MODES = new Set<BoardMode>([
  'webpage',
  'whiteboard',
  'blackboard',
  'grid-paper',
  'ruled-notebook',
]);
const VALID_SHAPES = new Set<ShapeToolType>([
  'line',
  'arrow',
  'double-arrow',
  'rect',
  'filled-rect',
  'circle',
  'ellipse',
  'freehand-shape',
]);
const VALID_PEN_STYLES = new Set<PenStyle>(['solid', 'calligraphy', 'dashed']);
const VALID_HIGHLIGHTER_STYLES = new Set<HighlighterStyle>(['soft', 'chisel']);
const VALID_TEXT_ALIGN = new Set<TextAlign>(['left', 'center', 'right']);

function isFinitePoint(p: unknown): p is Point {
  if (!p || typeof p !== 'object') return false;
  const pt = p as Record<string, unknown>;
  return typeof pt.x === 'number' && Number.isFinite(pt.x) && typeof pt.y === 'number' && Number.isFinite(pt.y);
}

function sanitizeAnnotationItem(raw: unknown): AnnotationItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id.trim()) return null;
  if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) return null;

  const coordSpace =
    item.coordSpace === 'document' || item.coordSpace === 'viewport'
      ? item.coordSpace
      : undefined;

  const timerMeta = {
    fadeDurationMs: typeof item.fadeDurationMs === 'number' ? item.fadeDurationMs : null,
    expiresAt:
      typeof item.expiresAt === 'number' && Number.isFinite(item.expiresAt) ? item.expiresAt : null,
    pausedRemainingMs:
      typeof item.pausedRemainingMs === 'number' && Number.isFinite(item.pausedRemainingMs)
        ? item.pausedRemainingMs
        : null,
    timerDurationMs:
      typeof item.timerDurationMs === 'number' && Number.isFinite(item.timerDurationMs)
        ? item.timerDurationMs
        : null,
  };

  if (item.category === 'stroke') {
    if (item.tool !== 'pen' && item.tool !== 'highlighter') return null;
    if (!Array.isArray(item.points) || item.points.length === 0 || !item.points.every(isFinitePoint)) {
      return null;
    }
    const color = typeof item.color === 'string' ? normalizeHex(item.color) : null;
    if (!color) return null;
    if (typeof item.thickness !== 'number' || item.thickness <= 0 || item.thickness > 200) return null;
    if (typeof item.opacity !== 'number' || item.opacity < 0 || item.opacity > 1) return null;
    return {
      id: item.id,
      category: 'stroke',
      coordSpace,
      tool: item.tool,
      points: item.points.map((p) => ({
        x: p.x,
        y: p.y,
        pressure: typeof p.pressure === 'number' ? Math.max(0.1, Math.min(1, p.pressure)) : undefined,
      })),
      color,
      thickness: item.thickness,
      opacity: item.opacity,
      penStyle: VALID_PEN_STYLES.has(item.penStyle as PenStyle)
        ? (item.penStyle as PenStyle)
        : undefined,
      highlighterStyle: VALID_HIGHLIGHTER_STYLES.has(item.highlighterStyle as HighlighterStyle)
        ? (item.highlighterStyle as HighlighterStyle)
        : undefined,
      createdAt: item.createdAt,
      ...timerMeta,
    };
  }

  if (item.category === 'shape') {
    if (typeof item.shapeType !== 'string' || !VALID_SHAPES.has(item.shapeType as ShapeToolType)) {
      return null;
    }
    if (!isFinitePoint(item.start) || !isFinitePoint(item.end)) return null;
    const color = typeof item.color === 'string' ? normalizeHex(item.color) : null;
    if (!color) return null;
    if (typeof item.thickness !== 'number' || item.thickness <= 0 || item.thickness > 100) return null;
    if (typeof item.opacity !== 'number' || item.opacity < 0 || item.opacity > 1) return null;
    const fillColor =
      typeof item.fillColor === 'string' && isValidHex(item.fillColor)
        ? normalizeHex(item.fillColor) ?? undefined
        : undefined;
    const points =
      Array.isArray(item.points) && item.points.every(isFinitePoint)
        ? item.points.map((p) => ({ x: p.x, y: p.y }))
        : undefined;
    return {
      id: item.id,
      category: 'shape',
      coordSpace,
      shapeType: item.shapeType as ShapeToolType,
      start: { x: item.start.x, y: item.start.y },
      end: { x: item.end.x, y: item.end.y },
      points,
      color,
      fillColor,
      fillOpacity:
        typeof item.fillOpacity === 'number' ? Math.max(0, Math.min(1, item.fillOpacity)) : undefined,
      thickness: item.thickness,
      opacity: item.opacity,
      arrowHeadSize: typeof item.arrowHeadSize === 'number' ? item.arrowHeadSize : undefined,
      createdAt: item.createdAt,
      ...timerMeta,
    };
  }

  if (item.category === 'text') {
    if (typeof item.x !== 'number' || !Number.isFinite(item.x)) return null;
    if (typeof item.y !== 'number' || !Number.isFinite(item.y)) return null;
    if (typeof item.text !== 'string') return null;
    const color = typeof item.color === 'string' ? normalizeHex(item.color) : null;
    if (!color) return null;
    const backgroundColor =
      item.backgroundColor === 'transparent'
        ? 'transparent'
        : typeof item.backgroundColor === 'string'
        ? normalizeHex(item.backgroundColor) ?? 'transparent'
        : 'transparent';
    return {
      id: item.id,
      category: 'text',
      coordSpace,
      x: item.x,
      y: item.y,
      text: item.text.slice(0, 1000),
      fontFamily: typeof item.fontFamily === 'string' ? item.fontFamily : 'Plus Jakarta Sans',
      fontSize:
        typeof item.fontSize === 'number' ? Math.max(10, Math.min(96, item.fontSize)) : 20,
      bold: Boolean(item.bold),
      italic: Boolean(item.italic),
      align: VALID_TEXT_ALIGN.has(item.align as TextAlign) ? (item.align as TextAlign) : 'left',
      color,
      backgroundColor,
      createdAt: item.createdAt,
      ...timerMeta,
    };
  }

  return null;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function validateImportedAnnotations(jsonText: string): ValidationResult<ExportedAnnotationBundle> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Invalid JSON syntax. Please select a valid ProScreen annotation file.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Imported JSON must be an object.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.schema !== 'proscreen-annotations-v1') {
    return {
      ok: false,
      error: 'Unsupported annotation file schema. Expected "proscreen-annotations-v1".',
    };
  }
  if (!Array.isArray(obj.items)) {
    return { ok: false, error: 'Annotation payload is missing an items array.' };
  }

  const sanitized: AnnotationItem[] = [];
  for (const rawItem of obj.items) {
    const clean = sanitizeAnnotationItem(rawItem);
    if (!clean) {
      return {
        ok: false,
        error: 'One or more annotation items failed schema validation (invalid coordinates, color, or type).',
      };
    }
    sanitized.push(clean);
  }

  const boardMode = VALID_BOARD_MODES.has(obj.boardMode as BoardMode)
    ? (obj.boardMode as BoardMode)
    : 'webpage';

  return {
    ok: true,
    data: {
      schema: 'proscreen-annotations-v1',
      exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
      tabKey: typeof obj.tabKey === 'string' ? obj.tabKey : 'imported',
      boardMode,
      items: sanitized,
      backgroundImageDataUrl:
        typeof obj.backgroundImageDataUrl === 'string' &&
        obj.backgroundImageDataUrl.startsWith('data:image/')
          ? obj.backgroundImageDataUrl
          : undefined,
    },
  };
}

export function mergeAndValidateSettings(raw: unknown): UserSettings {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Partial<UserSettings>;

  return {
    ...defaults,
    theme:
      obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system'
        ? obj.theme
        : defaults.theme,
    accentColor: normalizeHex(obj.accentColor ?? '') ?? defaults.accentColor,
    toolbarOrientation: 'vertical',
    toolbarSize:
      obj.toolbarSize === 'compact' || obj.toolbarSize === 'standard'
        ? obj.toolbarSize
        : defaults.toolbarSize,
    toolbarPinned: typeof obj.toolbarPinned === 'boolean' ? obj.toolbarPinned : defaults.toolbarPinned,
    toolbarCollapsed:
      typeof obj.toolbarCollapsed === 'boolean' ? obj.toolbarCollapsed : defaults.toolbarCollapsed,
    toolbarMinimized:
      typeof obj.toolbarMinimized === 'boolean' ? obj.toolbarMinimized : defaults.toolbarMinimized,
    showTooltips:
      typeof obj.showTooltips === 'boolean' ? obj.showTooltips : defaults.showTooltips,
    edgeSnapping:
      typeof obj.edgeSnapping === 'boolean' ? obj.edgeSnapping : defaults.edgeSnapping,
    toolbarPosition:
      obj.toolbarPosition &&
      typeof obj.toolbarPosition.x === 'number' &&
      typeof obj.toolbarPosition.y === 'number'
        ? {
            x: Math.max(8, obj.toolbarPosition.x),
            y: Math.max(8, obj.toolbarPosition.y),
          }
        : defaults.toolbarPosition,
    restoreButtonPosition:
      obj.restoreButtonPosition &&
      typeof obj.restoreButtonPosition.x === 'number' &&
      typeof obj.restoreButtonPosition.y === 'number'
        ? {
            x: Math.max(8, obj.restoreButtonPosition.x),
            y: Math.max(8, obj.restoreButtonPosition.y),
          }
        : defaults.restoreButtonPosition,
    defaultTool:
      typeof obj.defaultTool === 'string'
        ? obj.defaultTool === 'cursor'
          ? 'pointer'
          : obj.defaultTool
        : defaults.defaultTool,
    defaultBoardMode: VALID_BOARD_MODES.has(obj.defaultBoardMode as BoardMode)
      ? (obj.defaultBoardMode as BoardMode)
      : defaults.defaultBoardMode,
    whiteboardGrid:
      typeof obj.whiteboardGrid === 'boolean' ? obj.whiteboardGrid : defaults.whiteboardGrid,
    confirmBeforeClear:
      typeof obj.confirmBeforeClear === 'boolean'
        ? obj.confirmBeforeClear
        : defaults.confirmBeforeClear,
    pen: {
      color: normalizeHex(obj.pen?.color ?? '') ?? defaults.pen.color,
      thickness:
        typeof obj.pen?.thickness === 'number'
          ? Math.max(1, Math.min(48, obj.pen.thickness))
          : defaults.pen.thickness,
      opacity:
        typeof obj.pen?.opacity === 'number'
          ? Math.max(0.1, Math.min(1, obj.pen.opacity))
          : defaults.pen.opacity,
      penStyle: VALID_PEN_STYLES.has(obj.pen?.penStyle as PenStyle)
        ? obj.pen!.penStyle
        : defaults.pen.penStyle,
    },
    highlighter: {
      color: normalizeHex(obj.highlighter?.color ?? '') ?? defaults.highlighter.color,
      thickness:
        typeof obj.highlighter?.thickness === 'number'
          ? Math.max(6, Math.min(72, obj.highlighter.thickness))
          : defaults.highlighter.thickness,
      opacity:
        typeof obj.highlighter?.opacity === 'number'
          ? Math.max(0.1, Math.min(0.85, obj.highlighter.opacity))
          : defaults.highlighter.opacity,
      highlighterStyle: VALID_HIGHLIGHTER_STYLES.has(obj.highlighter?.highlighterStyle as HighlighterStyle)
        ? obj.highlighter!.highlighterStyle
        : defaults.highlighter.highlighterStyle,
    },
    eraserSize:
      typeof obj.eraserSize === 'number'
        ? Math.max(6, Math.min(80, obj.eraserSize))
        : defaults.eraserSize,
    laserColor: normalizeHex(obj.laserColor ?? '') ?? defaults.laserColor,
    laserSize:
      typeof obj.laserSize === 'number'
        ? Math.max(6, Math.min(40, obj.laserSize))
        : defaults.laserSize,
    laserTrailEnabled:
      typeof obj.laserTrailEnabled === 'boolean'
        ? obj.laserTrailEnabled
        : defaults.laserTrailEnabled,
    shape: {
      ...defaults.shape,
      ...(obj.shape ?? {}),
      color: normalizeHex(obj.shape?.color ?? '') ?? defaults.shape.color,
      fillColor: normalizeHex(obj.shape?.fillColor ?? '') ?? defaults.shape.fillColor,
    },
    text: {
      ...defaults.text,
      ...(obj.text ?? {}),
      align: VALID_TEXT_ALIGN.has(obj.text?.align as TextAlign)
        ? obj.text!.align
        : defaults.text.align,
      color: normalizeHex(obj.text?.color ?? '') ?? defaults.text.color,
      backgroundColor:
        obj.text?.backgroundColor === 'transparent'
          ? 'transparent'
          : normalizeHex(obj.text?.backgroundColor ?? '') ?? defaults.text.backgroundColor,
    },
    creator: {
      ...defaults.creator,
      ...(obj.creator ?? {}),
    },
    timer: {
      enabled:
        typeof obj.timer?.enabled === 'boolean' ? obj.timer.enabled : defaults.timer.enabled,
      durationMs:
        typeof obj.timer?.durationMs === 'number'
          ? clampTimerDurationMs(obj.timer.durationMs)
          : defaults.timer.durationMs,
      paused:
        typeof obj.timer?.paused === 'boolean' ? obj.timer.paused : defaults.timer.paused,
    },
    recording: {
      mode:
        obj.recording?.mode === 'screen' ||
        obj.recording?.mode === 'window' ||
        obj.recording?.mode === 'tab' ||
        obj.recording?.mode === 'area'
          ? obj.recording.mode
          : defaults.recording.mode,
      quality:
        obj.recording?.quality === 'high' ||
        obj.recording?.quality === 'ultra' ||
        obj.recording?.quality === 'ultra-pro' ||
        obj.recording?.quality === 'standard'
          ? obj.recording.quality
          : defaults.recording.quality,
      resolution:
        obj.recording?.resolution === '4k' ||
        obj.recording?.resolution === '8k' ||
        obj.recording?.resolution === '16k' ||
        obj.recording?.resolution === 'source' ||
        obj.recording?.resolution === '1440p' ||
        obj.recording?.resolution === '1080p' ||
        obj.recording?.resolution === '720p'
          ? obj.recording.resolution
          : defaults.recording.resolution,
      frameRate:
        obj.recording?.frameRate === 120
          ? 120
          : obj.recording?.frameRate === 60
          ? 60
          : obj.recording?.frameRate === 30
          ? 30
          : defaults.recording.frameRate,
      mimeType:
        typeof obj.recording?.mimeType === 'string' && obj.recording.mimeType.trim()
          ? obj.recording.mimeType.trim()
          : defaults.recording.mimeType,
      videoBitrate:
        typeof obj.recording?.videoBitrate === 'number' && obj.recording.videoBitrate > 0
          ? obj.recording.videoBitrate
          : 'auto',
      codec:
        typeof obj.recording?.codec === 'string' && obj.recording.codec.trim()
          ? obj.recording.codec.trim()
          : undefined,
      micAudio:
        typeof obj.recording?.micAudio === 'boolean'
          ? obj.recording.micAudio
          : defaults.recording.micAudio,
      tabAudio:
        typeof obj.recording?.tabAudio === 'boolean'
          ? obj.recording.tabAudio
          : defaults.recording.tabAudio,
      micDeviceId:
        typeof obj.recording?.micDeviceId === 'string' ? obj.recording.micDeviceId : undefined,
      micGain:
        typeof obj.recording?.micGain === 'number' && Number.isFinite(obj.recording.micGain)
          ? Math.max(0.5, Math.min(2.5, Math.round(obj.recording.micGain * 100) / 100))
          : (defaults.recording.micGain ?? 1.4),
      areaRect:
        obj.recording?.areaRect &&
        typeof obj.recording.areaRect.x === 'number' &&
        typeof obj.recording.areaRect.y === 'number' &&
        typeof obj.recording.areaRect.width === 'number' &&
        typeof obj.recording.areaRect.height === 'number' &&
        obj.recording.areaRect.width > 0 &&
        obj.recording.areaRect.height > 0
          ? {
              x: Math.round(obj.recording.areaRect.x),
              y: Math.round(obj.recording.areaRect.y),
              width: Math.round(obj.recording.areaRect.width),
              height: Math.round(obj.recording.areaRect.height),
              ...(typeof obj.recording.areaRect.displayId === 'string'
                ? { displayId: obj.recording.areaRect.displayId }
                : {}),
              ...(obj.recording.areaRect.displayBounds &&
              typeof obj.recording.areaRect.displayBounds.x === 'number' &&
              typeof obj.recording.areaRect.displayBounds.y === 'number' &&
              typeof obj.recording.areaRect.displayBounds.width === 'number' &&
              typeof obj.recording.areaRect.displayBounds.height === 'number'
                ? {
                    displayBounds: {
                      x: Math.round(obj.recording.areaRect.displayBounds.x),
                      y: Math.round(obj.recording.areaRect.displayBounds.y),
                      width: Math.round(obj.recording.areaRect.displayBounds.width),
                      height: Math.round(obj.recording.areaRect.displayBounds.height),
                    },
                  }
                : {}),
            }
          : null,
      echoCancellation:
        typeof obj.recording?.echoCancellation === 'boolean'
          ? obj.recording.echoCancellation
          : true,
      noiseSuppression:
        typeof obj.recording?.noiseSuppression === 'boolean'
          ? obj.recording.noiseSuppression
          : true,
      autoGainControl:
        typeof obj.recording?.autoGainControl === 'boolean'
          ? obj.recording.autoGainControl
          : false,
    },
    exportPrefs: {
      askWhereToSave:
        typeof obj.exportPrefs?.askWhereToSave === 'boolean'
          ? obj.exportPrefs.askWhereToSave
          : defaults.exportPrefs.askWhereToSave,
    },
    recentColors: Array.isArray(obj.recentColors)
      ? obj.recentColors.map((c) => normalizeHex(c)).filter((c): c is string => Boolean(c)).slice(0, 8)
      : defaults.recentColors,
    favoriteColors: Array.isArray(obj.favoriteColors)
      ? obj.favoriteColors
          .map((c) => normalizeHex(c))
          .filter((c): c is string => Boolean(c))
          .slice(0, 12)
      : defaults.favoriteColors,
    shortcuts:
      Array.isArray(obj.shortcuts) && obj.shortcuts.length > 0
        ? defaults.shortcuts.map((def) => {
            const found = obj.shortcuts?.find((s) => s.id === def.id);
            return found && typeof found.keys === 'string' && found.keys.trim()
              ? { ...def, keys: found.keys.trim() }
              : def;
          })
        : defaults.shortcuts,
  };
}

export function validateImportedSettingsJson(jsonText: string): ValidationResult<UserSettings> {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== 1) {
      return { ok: false, error: 'Invalid settings file format (expected schemaVersion: 1).' };
    }
    return { ok: true, data: mergeAndValidateSettings(parsed) };
  } catch {
    return { ok: false, error: 'Invalid JSON syntax in settings file.' };
  }
}

export function sanitizeSavedSessions(raw: unknown): SavedSession[] {
  if (!Array.isArray(raw)) return [];
  const valid: SavedSession[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.id !== 'string' || typeof obj.name !== 'string' || !Array.isArray(obj.items)) {
      continue;
    }
    const cleanItems = obj.items
      .map(sanitizeAnnotationItem)
      .filter((i): i is AnnotationItem => i !== null);
    valid.push({
      id: obj.id,
      name: obj.name,
      tabKey: typeof obj.tabKey === 'string' ? obj.tabKey : 'local',
      url: typeof obj.url === 'string' ? obj.url : '',
      savedAt: typeof obj.savedAt === 'number' ? obj.savedAt : Date.now(),
      boardMode: VALID_BOARD_MODES.has(obj.boardMode as BoardMode)
        ? (obj.boardMode as BoardMode)
        : 'webpage',
      items: cleanItems,
      backgroundImageDataUrl:
        typeof obj.backgroundImageDataUrl === 'string' &&
        obj.backgroundImageDataUrl.startsWith('data:image/')
          ? obj.backgroundImageDataUrl
          : undefined,
    });
  }
  return valid;
}
