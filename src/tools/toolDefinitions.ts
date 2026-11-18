import { ShapeToolType, ToolType } from '../types/annotation';

export interface ToolMeta {
  id: ToolType;
  label: string;
  description: string;
  defaultShortcut?: string;
}

export const PRIMARY_TOOLS: ToolMeta[] = [
  {
    id: 'pointer',
    label: 'Pointer',
    description: 'Interact with underlying webpage normally or select ink objects',
    defaultShortcut: 'Alt+V',
  },
  {
    id: 'pen',
    label: 'Pen',
    description: 'Smooth freehand drawing with pen styles and pressure support',
    defaultShortcut: 'Alt+P',
  },
  {
    id: 'highlighter',
    label: 'Highlighter',
    description: 'Translucent marker that keeps text readable',
    defaultShortcut: 'Alt+H',
  },
  {
    id: 'eraser',
    label: 'Eraser',
    description: 'Click or drag to erase individual strokes and shapes',
    defaultShortcut: 'Alt+E',
  },
  {
    id: 'arrow',
    label: 'Arrow',
    description: 'Draw directional callout arrows',
    defaultShortcut: 'Alt+A',
  },
  {
    id: 'rect',
    label: 'Shapes',
    description: 'Line, arrow, rectangle, circle, triangle, diamond, star, and heart tools',
    defaultShortcut: 'Alt+R',
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Insert, style, align, and move rich text annotations',
    defaultShortcut: 'Alt+T',
  },
  {
    id: 'laser',
    label: 'Laser',
    description: 'Temporary glowing pointer with configurable trail for presentations',
    defaultShortcut: 'Alt+L',
  },
];

export interface ShapeToolMeta {
  id: ShapeToolType;
  label: string;
}

export const SHAPE_TOOLS: ShapeToolMeta[] = [
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'rect', label: 'Rectangle / Square' },
  { id: 'circle', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
];

export function isShapeTool(tool: ToolType): tool is ShapeToolType {
  return (
    tool === 'line' ||
    tool === 'arrow' ||
    tool === 'double-arrow' ||
    tool === 'rect' ||
    tool === 'filled-rect' ||
    tool === 'circle' ||
    tool === 'triangle' ||
    tool === 'diamond' ||
    tool === 'star' ||
    tool === 'heart' ||
    tool === 'ellipse' ||
    tool === 'freehand-shape'
  );
}
