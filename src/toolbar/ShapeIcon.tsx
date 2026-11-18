import React from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Circle,
  Diamond,
  Heart,
  Minus,
  Spline,
  Square,
  SquareDot,
  Star,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import { ShapeToolType } from '../types/annotation';

const SHAPE_ICON: Record<ShapeToolType, LucideIcon> = {
  line: Minus,
  arrow: ArrowUpRight,
  rect: Square,
  circle: Circle,
  triangle: Triangle,
  diamond: Diamond,
  star: Star,
  heart: Heart,
  // Keep icons for legacy stored/selected shape types while they remain supported.
  'double-arrow': ArrowLeftRight,
  'filled-rect': SquareDot,
  ellipse: Circle,
  'freehand-shape': Spline,
};

export function ShapeIcon({
  shape,
  className,
  strokeWidth = 1.8,
}: {
  shape: ShapeToolType;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = SHAPE_ICON[shape];
  return <Icon aria-hidden="true" data-shape-icon={shape} className={className} strokeWidth={strokeWidth} />;
}
