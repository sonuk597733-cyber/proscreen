import { DesktopDisplayInfo, VirtualScreenBounds } from './desktopTypes';

/**
 * Calculates the encompassing virtual screen bounds across all connected displays.
 * Windows multi-monitor arrangements may place secondary displays to the left (negative X)
 * or above (negative Y) the primary display.
 */
export function calculateVirtualBounds(displays: DesktopDisplayInfo[]): VirtualScreenBounds {
  if (!displays || displays.length === 0) {
    return {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      displays: [],
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    const { x, y, width, height } = display.bounds;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + width > maxX) maxX = x + width;
    if (y + height > maxY) maxY = y + height;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    displays,
  };
}

/**
 * Maps a coordinate from global virtual desktop space into a specific display's local space.
 */
export function globalToDisplayCoords(
  globalX: number,
  globalY: number,
  display: DesktopDisplayInfo
): { x: number; y: number } {
  return {
    x: globalX - display.bounds.x,
    y: globalY - display.bounds.y,
  };
}

/**
 * Finds which display contains the given global screen coordinates.
 * Falls back to primary display or the first display.
 */
export function findDisplayForPoint(
  x: number,
  y: number,
  displays: DesktopDisplayInfo[]
): DesktopDisplayInfo | undefined {
  if (displays.length === 0) return undefined;

  for (const display of displays) {
    const b = display.bounds;
    if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
      return display;
    }
  }

  // Fallback to primary display or first
  return displays.find((d) => d.isPrimary) || displays[0];
}

/**
 * Clamps toolbar window coordinates so it never gets lost off-screen when monitors disconnect.
 */
export function clampToolbarToDisplays(
  x: number,
  y: number,
  width: number,
  height: number,
  displays: DesktopDisplayInfo[]
): { x: number; y: number } {
  const targetDisplay = findDisplayForPoint(x, y, displays);
  if (!targetDisplay) return { x, y };

  const work = targetDisplay.workArea || targetDisplay.bounds;
  const clampedX = Math.max(work.x, Math.min(work.x + work.width - width, x));
  const clampedY = Math.max(work.y, Math.min(work.y + work.height - height, y));

  return { x: clampedX, y: clampedY };
}
