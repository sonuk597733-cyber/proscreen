export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PresetColor {
  name: string;
  hex: string;
}

/** 32 curated high-contrast colors tailored for light webpages, dark code editors, whiteboards, and blackboards */
export const PRESET_COLORS: PresetColor[] = [
  // Row 1: Neutrals & Ink
  { name: 'Obsidian', hex: '#0F172A' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Silver', hex: '#94A3B8' },
  { name: 'Chalk White', hex: '#F8FAFC' },
  // Row 2: Reds & Corals
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Coral', hex: '#FB7185' },
  { name: 'Brick', hex: '#B91C1C' },
  // Row 3: Oranges & Ambers
  { name: 'Tangerine', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Signal Yellow', hex: '#FACC15' },
  { name: 'Highlighter Gold', hex: '#FDE047' },
  // Row 4: Greens & Teals
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Lime Ink', hex: '#84CC16' },
  { name: 'Forest', hex: '#15803D' },
  { name: 'Mint', hex: '#34D399' },
  // Row 5: Cyans & Blues
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Cobalt', hex: '#2563EB' },
  // Row 6: Indigos & Violets
  { name: 'Royal Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Plum', hex: '#7E22CE' },
  // Row 7: Magentas & Warm Accents
  { name: 'Fuchsia', hex: '#D946EF' },
  { name: 'Magenta', hex: '#EC4899' },
  { name: 'Peach', hex: '#FDBA74' },
  { name: 'Bronze', hex: '#B45309' },
  // Row 8: Pastel Highlighter Set
  { name: 'Highlighter Green', hex: '#86EFAC' },
  { name: 'Highlighter Cyan', hex: '#67E8F9' },
  { name: 'Highlighter Pink', hex: '#F9A8D4' },
  { name: 'Highlighter Lavender', hex: '#C4B5FD' },
];

export function normalizeHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((ch) => ch + ch)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return null;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const intVal = parseInt(normalized.slice(1), 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(Number.isFinite(n) ? n : 0)));
  const toPart = (n: number) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toPart(r)}${toPart(g)}${toPart(b)}`;
}

export function hexToRgbaString(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex) ?? { r: 37, g: 99, b: 235 };
  const alpha = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function pushRecentColor(recentColors: string[], hex: string, max = 8): string[] {
  const normalized = normalizeHex(hex);
  if (!normalized) return recentColors;
  const filtered = recentColors.filter((c) => normalizeHex(c) !== normalized);
  return [normalized, ...filtered].slice(0, max);
}

export function toggleFavoriteColor(favoriteColors: string[], hex: string, max = 12): string[] {
  const normalized = normalizeHex(hex);
  if (!normalized) return favoriteColors;
  const exists = favoriteColors.some((c) => normalizeHex(c) === normalized);
  if (exists) {
    return favoriteColors.filter((c) => normalizeHex(c) !== normalized);
  }
  return [normalized, ...favoriteColors].slice(0, max);
}

export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
}
