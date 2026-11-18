export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The pointer may cross the small transparent seam between the toolbar and its flyout. */
export function isPointerInsidePopoutBoundary(
  point: ScreenPoint,
  toolbar: ScreenRect,
  popout: ScreenRect,
  padding = 10
): boolean {
  const within = (rect: ScreenRect) =>
    point.x >= rect.x - padding &&
    point.x <= rect.x + rect.width + padding &&
    point.y >= rect.y - padding &&
    point.y <= rect.y + rect.height + padding;
  return within(toolbar) || within(popout);
}

export function shouldDismissPopoutForPointer(input: {
  pointerInside: boolean;
  outsideSince: number | null;
  now: number;
  delayMs?: number;
}): boolean {
  return !input.pointerInside &&
    input.outsideSince !== null &&
    input.now - input.outsideSince >= (input.delayMs ?? 240);
}
