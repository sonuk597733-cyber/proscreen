/**
 * High-Contrast Tool Cursors for ProScreen
 *
 * Designed for optimal visibility on pure black backgrounds (#000000),
 * dark desktop modes, whiteboards, and busy screen contents.
 *
 * Each cursor features:
 * 1. Dual-tone design: crisp white (#FFFFFF) body/center with a solid dark outline (#0F172A).
 * 2. Vibrant accent highlights (cyan #38BDF8, yellow #FDE047, red #EF4444, pink #F472B6).
 * 3. Exact integer hotspots matching the drawing/interaction tip.
 * 4. Fallback cursor keywords for full browser resilience.
 */

// 1. PEN: Dual-tone precision stylus nib pointing to [2, 22]
export const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='%230F172A' stroke='%230F172A' stroke-width='2.5' stroke-linejoin='round'/%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='%23FFFFFF'/%3E%3Cpath d='M2 22l1.5-5.5 4 4Z' fill='%2338BDF8' stroke='%230F172A' stroke-width='0.75'/%3E%3C/svg%3E") 2 22, crosshair`;

// 2. HIGHLIGHTER: Angled chisel marker pointing to [3, 20]
export const HIGHLIGHTER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cg stroke='%230F172A' stroke-width='2.5' stroke-linejoin='round' fill='%230F172A'%3E%3Cpath d='m9 11-6 6v3h3l6-6Z'/%3E%3Cpath d='m22 7-4.5-4.5a2.12 2.12 0 0 0-3 0l-2.5 2.5 7.5 7.5 2.5-2.5a2.12 2.12 0 0 0 0-3Z'/%3E%3C/g%3E%3Cpath d='m22 7-4.5-4.5a2.12 2.12 0 0 0-3 0l-2.5 2.5 7.5 7.5 2.5-2.5a2.12 2.12 0 0 0 0-3Z' fill='%23FFFFFF'/%3E%3Cpath d='m9 11-6 6v3h3l6-6Z' fill='%23FDE047'/%3E%3Cpath d='M3 20l3-3' stroke='%230F172A' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 3 20, crosshair`;

// 3. ERASER: Block eraser with pink rubber tip pointing to [4, 20]
export const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='m18 14 2.5-2.5a2.12 2.12 0 0 0 0-3l-5-5a2.12 2.12 0 0 0-3 0L3.5 12.5a2.12 2.12 0 0 0 0 3L6 18h12' fill='%230F172A' stroke='%230F172A' stroke-width='2.5' stroke-linejoin='round'/%3E%3Cpath d='m18 14 2.5-2.5a2.12 2.12 0 0 0 0-3l-5-5a2.12 2.12 0 0 0-3 0L8 8l7.5 7.5 2.5-1.5' fill='%23FFFFFF'/%3E%3Cpath d='M8 8 3.5 12.5a2.12 2.12 0 0 0 0 3L6 18l5-5-3-5Z' fill='%23F472B6'/%3E%3Cline x1='6' y1='18' x2='18' y2='18' stroke='%230F172A' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 4 20, crosshair`;

// 4. ARROW: Precision directional pointer with cyan accent pointing to [2, 2]
export const ARROW_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M2 2l7 19 3.5-7.5L20 10 2 2Z' fill='%230F172A' stroke='%230F172A' stroke-width='2.5' stroke-linejoin='round'/%3E%3Cpath d='M2 2l7 19 3.5-7.5L20 10 2 2Z' fill='%23FFFFFF'/%3E%3Cpath d='M2 2l6 6' stroke='%2338BDF8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 2 2, crosshair`;

// 5. SHAPE CROSSHAIR: Dual-tone precision targeting crosshair with center dot at [12, 12]
// Dark outer stroke + white inner line guarantee 100% visibility on both black and white surfaces
export const SHAPE_CROSSHAIR_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='1' x2='12' y2='9' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round'/%3E%3Cline x1='12' y1='15' x2='12' y2='23' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round'/%3E%3Cline x1='1' y1='12' x2='9' y2='12' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round'/%3E%3Cline x1='15' y1='12' x2='23' y2='12' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='12' r='4' fill='none' stroke='%230F172A' stroke-width='3.5'/%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3Cline x1='12' y1='16' x2='12' y2='22' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3Cline x1='2' y1='12' x2='8' y2='12' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3Cline x1='16' y1='12' x2='22' y2='12' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3Ccircle cx='12' cy='12' r='4' fill='none' stroke='%23FFFFFF' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='1.25' fill='%2338BDF8'/%3E%3C/svg%3E") 12 12, crosshair`;

// 6. TEXT: Dual-tone I-beam with serif bars centered at [8, 12]
export const TEXT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24' viewBox='0 0 16 24'%3E%3Cpath d='M4 3h8M8 3v18M4 21h8' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round'/%3E%3Cpath d='M4 3h8M8 3v18M4 21h8' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E") 8 12, text`;

// 7. SELECT / MOVE: Dual-tone 4-way arrow centered at [12, 12]
export const SELECT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l-3 3h2v4H7V7l-3 3 3 3v-2h4v4H9l3 3 3-3h-2v-4h4v2l3-3-3-3v2h-4V5h2l-3-3Z' fill='%230F172A' stroke='%230F172A' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M12 2l-3 3h2v4H7V7l-3 3 3 3v-2h4v4H9l3 3 3-3h-2v-4h4v2l3-3-3-3v2h-4V5h2l-3-3Z' fill='%23FFFFFF'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%2338BDF8'/%3E%3C/svg%3E") 12 12, move`;

// 8. LASER: Luminous red laser pointer with white core centered at [6, 6]
export const LASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='none' stroke='%230F172A' stroke-width='2'/%3E%3Ccircle cx='8' cy='8' r='5' fill='%23EF4444' stroke='%23FFFFFF' stroke-width='1.5'/%3E%3Ccircle cx='8' cy='8' r='2' fill='%23FFFFFF'/%3E%3C/svg%3E") 8 8, crosshair`;

// 9. AREA SELECTOR / CROP: Precision framing brackets with center dot at [12, 12]
export const AREA_CROP_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5' fill='none' stroke='%230F172A' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5' fill='none' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%2338BDF8' stroke='%230F172A' stroke-width='0.75'/%3E%3C/svg%3E") 12 12, crosshair`;

/**
 * Returns the CSS cursor string for the specified active tool and state.
 */
export function getHighContrastCursor(activeTool: string, isPassThrough: boolean): string {
  if (isPassThrough || activeTool === 'pointer' || activeTool === 'cursor') {
    return 'default';
  }
  switch (activeTool) {
    case 'pen':
      return PEN_CURSOR;
    case 'highlighter':
      return HIGHLIGHTER_CURSOR;
    case 'eraser':
      return ERASER_CURSOR;
    case 'arrow':
    case 'double-arrow':
      return ARROW_CURSOR;
    case 'text':
      return TEXT_CURSOR;
    case 'select':
      return SELECT_CURSOR;
    case 'laser':
      return LASER_CURSOR;
    case 'capture-area':
    case 'crop':
      return AREA_CROP_CURSOR;
    case 'line':
    case 'rect':
    case 'circle':
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'heart':
    case 'ellipse':
    case 'filled-rect':
    case 'freehand-shape':
      return SHAPE_CROSSHAIR_CURSOR;
    default:
      return PEN_CURSOR;
  }
}
