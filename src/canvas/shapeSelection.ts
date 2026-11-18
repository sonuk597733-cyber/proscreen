import { Point } from '../types/annotation';
import { distanceBetweenPoints } from './geometry';

export interface ShapeClickCandidate {
  shapeId: string;
  point: Point;
  time: number;
}

export function isShapeDoubleClick(
  shapeId: string,
  point: Point,
  clickCount: number,
  previousClick: ShapeClickCandidate | null,
  now: number
): boolean {
  if (clickCount >= 2) return true;
  return Boolean(
    previousClick?.shapeId === shapeId &&
      now - previousClick.time <= 450 &&
      distanceBetweenPoints(point, previousClick.point) <= 12
  );
}
