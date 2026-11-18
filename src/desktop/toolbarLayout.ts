export const DESKTOP_TOOLBAR_WIDTH = 44;
export const DESKTOP_TOOLBAR_MAX_HEIGHT = 680;
export const DESKTOP_TOOLBAR_MIN_HEIGHT = 44;

/** Keep the full toolbar visible on standard desktop work areas; reserve room for taskbars. */
export function getDesktopToolbarHeight(workAreaHeight: number): number {
  if (!Number.isFinite(workAreaHeight) || workAreaHeight <= 0) {
    return DESKTOP_TOOLBAR_MAX_HEIGHT;
  }
  return Math.max(
    DESKTOP_TOOLBAR_MIN_HEIGHT,
    Math.min(DESKTOP_TOOLBAR_MAX_HEIGHT, Math.floor(workAreaHeight - 8))
  );
}
