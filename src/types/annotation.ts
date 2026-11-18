export type ToolType =
  | 'pointer'
  | 'cursor'
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'rect'
  | 'filled-rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'freehand-shape'
  | 'text'
  | 'laser';

export type InteractionMode = 'pointer' | 'drawing';

export function isDrawingTool(tool: ToolType | string): boolean {
  return (
    tool === 'pen' ||
    tool === 'highlighter' ||
    tool === 'eraser' ||
    tool === 'arrow' ||
    tool === 'line' ||
    tool === 'double-arrow' ||
    tool === 'rect' ||
    tool === 'filled-rect' ||
    tool === 'circle' ||
    tool === 'triangle' ||
    tool === 'diamond' ||
    tool === 'star' ||
    tool === 'heart' ||
    tool === 'ellipse' ||
    tool === 'freehand-shape' ||
    tool === 'text' ||
    tool === 'laser'
  );
}

export function isPointerTool(tool: ToolType | string): boolean {
  return tool === 'pointer' || tool === 'cursor';
}

export type ShapeToolType =
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'rect'
  | 'filled-rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'heart'
  | 'freehand-shape';

export type BoardMode =
  | 'webpage'
  | 'whiteboard'
  | 'blackboard'
  | 'grid-paper'
  | 'ruled-notebook';

export type PenStyle = 'solid' | 'calligraphy' | 'dashed';
export type HighlighterStyle = 'soft' | 'chisel';
export type TextAlign = 'left' | 'center' | 'right';

export type AnnotationCategory = 'stroke' | 'shape' | 'text';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export type CoordinateSpace = 'document' | 'viewport';

export interface BaseAnnotation {
  id: string;
  category: AnnotationCategory;
  coordSpace?: CoordinateSpace;
  createdAt: number;
  /** Optional fade duration in ms when optional fading ink was active at creation */
  fadeDurationMs?: number | null;
  /** Timestamp (ms) when a timer-scheduled annotation expires; null/undefined = never expires */
  expiresAt?: number | null;
  /** Remaining ms frozen while the annotation timer is paused */
  pausedRemainingMs?: number | null;
  /** Original timer duration (ms) applied when this annotation was created */
  timerDurationMs?: number | null;
}

export interface StrokeAnnotation extends BaseAnnotation {
  category: 'stroke';
  tool: 'pen' | 'highlighter';
  points: Point[];
  color: string;
  thickness: number;
  opacity: number;
  penStyle?: PenStyle;
  highlighterStyle?: HighlighterStyle;
}

export interface ShapeAnnotation extends BaseAnnotation {
  category: 'shape';
  shapeType: ShapeToolType;
  start: Point;
  end: Point;
  /** Captured contour points when shapeType === 'freehand-shape' */
  points?: Point[];
  color: string;
  fillColor?: string;
  fillOpacity?: number;
  thickness: number;
  opacity: number;
  arrowHeadSize?: number;
}

export interface TextAnnotation extends BaseAnnotation {
  category: 'text';
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align?: TextAlign;
  color: string;
  backgroundColor: string;
}

export type AnnotationItem = StrokeAnnotation | ShapeAnnotation | TextAnnotation;

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface BoardPage {
  id: string;
  title: string;
  boardMode: Exclude<BoardMode, 'webpage'>;
  backgroundImageDataUrl?: string;
  items: AnnotationItem[];
}

export interface SavedSession {
  id: string;
  name: string;
  tabKey: string;
  url: string;
  savedAt: number;
  boardMode: BoardMode;
  items: AnnotationItem[];
  backgroundImageDataUrl?: string;
}

export interface ExportedAnnotationBundle {
  schema: 'proscreen-annotations-v1';
  exportedAt: number;
  tabKey: string;
  boardMode: BoardMode;
  items: AnnotationItem[];
  backgroundImageDataUrl?: string;
}
