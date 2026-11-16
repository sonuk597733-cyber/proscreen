import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { ResolvedThemeMode, UserSettings } from '../types/settings';
import { ToolType } from '../types/annotation';
import { isShapeTool } from '../tools/toolDefinitions';
import {
  PRESET_COLORS,
  hexToRgb,
  hexToRgbaString,
  normalizeHex,
  rgbToHex,
} from '../utils/color';

interface ColorBrushPopoverProps {
  open: boolean;
  activeTool: ToolType;
  settings: UserSettings;
  resolvedTheme: ResolvedThemeMode;
  onSelectToolTarget: (tool: 'pen' | 'highlighter' | 'laser') => void;
  onChangeColor: (hex: string) => void;
  onChangeThickness: (thickness: number) => void;
  onChangeOpacity: (opacity: number) => void;
  onToggleFavorite: (hex: string) => void;
  onUpdateShapeFill: (fillColor: string, fillOpacity: number) => void;
  onClose: () => void;
}

export const ColorBrushPopover: React.FC<ColorBrushPopoverProps> = ({
  open,
  activeTool,
  settings,
  resolvedTheme,
  onSelectToolTarget,
  onChangeColor,
  onChangeThickness,
  onChangeOpacity,
  onToggleFavorite,
  onUpdateShapeFill,
  onClose,
}) => {
  const isHighlighter = activeTool === 'highlighter';
  const isLaser = activeTool === 'laser';
  const isShape = isShapeTool(activeTool);

  const currentColor = isHighlighter
    ? settings.highlighter.color
    : isShape
    ? settings.shape.color
    : activeTool === 'text'
    ? settings.text.color
    : isLaser
    ? settings.laserColor
    : settings.pen.color;

  const currentThickness = isHighlighter
    ? settings.highlighter.thickness
    : isShape
    ? settings.shape.thickness
    : activeTool === 'eraser'
    ? settings.eraserSize
    : isLaser
    ? settings.laserSize
    : settings.pen.thickness;

  const currentOpacity = isHighlighter
    ? settings.highlighter.opacity
    : isShape
    ? settings.shape.opacity
    : settings.pen.opacity;

  const [prevPropColor, setPrevPropColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);
  const [rgb, setRgb] = useState(() => hexToRgb(currentColor) ?? { r: 37, g: 99, b: 235 });

  if (prevPropColor !== currentColor) {
    setPrevPropColor(currentColor);
    setHexInput(currentColor);
    const parsed = hexToRgb(currentColor);
    if (parsed) setRgb(parsed);
  }

  if (!open) return null;

  const isDark = resolvedTheme === 'dark';
  const isFav = settings.favoriteColors.some(
    (c) => normalizeHex(c) === normalizeHex(currentColor)
  );

  const handleHexChange = (val: string) => {
    setHexInput(val);
    const normalized = normalizeHex(val);
    if (normalized) {
      onChangeColor(normalized);
      const parsed = hexToRgb(normalized);
      if (parsed) setRgb(parsed);
    }
  };

  const handleRgbChannel = (channel: 'r' | 'g' | 'b', rawVal: string) => {
    const num = Math.max(0, Math.min(255, Number(rawVal) || 0));
    const next = { ...rgb, [channel]: num };
    setRgb(next);
    const hex = rgbToHex(next.r, next.g, next.b);
    setHexInput(hex);
    onChangeColor(hex);
  };

  const maxThickness = isHighlighter ? 64 : activeTool === 'eraser' ? 72 : 36;
  const minThickness = isHighlighter ? 8 : activeTool === 'eraser' || isLaser ? 6 : 1;
  const thicknessLabel =
    activeTool === 'eraser'
      ? 'Eraser Size'
      : isLaser
      ? 'Laser Size'
      : isShape
      ? 'Border Width'
      : 'Thickness';

  return (
    <div
      data-testid="color-brush-popover"
      role="dialog"
      aria-label="Color and brush studio"
      className={`pointer-events-auto w-[324px] min-w-[324px] max-w-[calc(100vw-32px)] max-h-[min(520px,calc(100vh-16px))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-lg border p-3 shadow-[0_14px_34px_-6px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-[#1B1D24]/98 border-[#2E323E] text-[#E4E7EF]'
          : 'bg-[#FBFBFD]/98 border-[#CBD2E1] text-[#111827]'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 pb-2 border-b ${
          isDark ? 'border-[#2D313D]' : 'border-[#E5E8F0]'
        }`}
      >
        <div
          className={`flex items-center gap-0.5 p-0.5 rounded-md ${
            isDark ? 'bg-[#14161C]' : 'bg-[#F1F3F8]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              onSelectToolTarget('pen');
              onClose();
            }}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              !isHighlighter && !isLaser
                ? isDark
                  ? 'bg-[#2A2E39] text-white'
                  : 'bg-white text-[#181B22] shadow-sm'
                : 'text-[#8E96A8] hover:text-current'
            }`}
          >
            Pen / Ink
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectToolTarget('highlighter');
              onClose();
            }}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              isHighlighter
                ? isDark
                  ? 'bg-[#2A2E39] text-white'
                  : 'bg-white text-[#181B22] shadow-sm'
                : 'text-[#8E96A8] hover:text-current'
            }`}
          >
            Highlighter
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectToolTarget('laser');
              onClose();
            }}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              isLaser
                ? isDark
                  ? 'bg-[#2A2E39] text-white'
                  : 'bg-white text-[#181B22] shadow-sm'
                : 'text-[#8E96A8] hover:text-current'
            }`}
          >
            Laser
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close color panel"
          className="p-1 rounded-md text-[#8E96A8] hover:text-current hover:bg-slate-500/15 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Live stroke preview */}
      <div
        className={`mt-2.5 rounded-lg border p-2 flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#14161C] border-[#2B2F3B]' : 'bg-[#F6F8FB] border-[#E2E6EF]'
        }`}
      >
        <svg width="190" height="32" viewBox="0 0 190 32" aria-label="Live stroke preview">
          <path
            d="M 10 22 Q 52 5, 95 18 T 180 12"
            fill="none"
            stroke={hexToRgbaString(currentColor, currentOpacity)}
            strokeWidth={Math.min(24, currentThickness)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-right font-mono text-[11px] tabular-nums text-[#8E96A8] shrink-0">
          <div>{currentThickness}px</div>
          <div>{Math.round(currentOpacity * 100)}%</div>
        </div>
      </div>

      {/* Thickness & Opacity sliders */}
      <div className="mt-2.5 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <label htmlFor="proscreen-thickness-range" className="font-medium">
              {thicknessLabel}
            </label>
            <span className="font-mono tabular-nums text-[#8E96A8]">{currentThickness} px</span>
          </div>
          <input
            id="proscreen-thickness-range"
            type="range"
            min={minThickness}
            max={maxThickness}
            value={currentThickness}
            onChange={(e) => onChangeThickness(Number(e.target.value))}
            onPointerUp={onClose}
            onKeyUp={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                onClose();
              }
            }}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        {activeTool !== 'eraser' && activeTool !== 'laser' && (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <label htmlFor="proscreen-opacity-range" className="font-medium">
                Opacity
              </label>
              <span className="font-mono tabular-nums text-[#8E96A8]">
                {Math.round(currentOpacity * 100)}%
              </span>
            </div>
            <input
              id="proscreen-opacity-range"
              type="range"
              min={10}
              max={100}
              value={Math.round(currentOpacity * 100)}
              onChange={(e) => onChangeOpacity(Number(e.target.value) / 100)}
              onPointerUp={onClose}
              onKeyUp={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                  onClose();
                }
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 32 Preset Swatches */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-medium">Palette (32 Presets)</span>
          <button
            type="button"
            onClick={() => onToggleFavorite(currentColor)}
            aria-label={isFav ? 'Remove from favorite colors' : 'Add to favorite colors'}
            className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              isFav ? 'text-amber-400 bg-amber-500/10' : 'text-[#8E96A8] hover:text-current'
            }`}
          >
            <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
            <span>{isFav ? 'Favorited' : 'Favorite'}</span>
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1.5 w-full">
          {PRESET_COLORS.map((preset) => {
            const active = normalizeHex(preset.hex) === normalizeHex(currentColor);
            return (
              <button
                key={preset.hex}
                type="button"
                aria-label={`Color ${preset.name}`}
                title={`${preset.name} (${preset.hex})`}
                onClick={() => {
                  onChangeColor(preset.hex);
                  onClose();
                }}
                style={{ backgroundColor: preset.hex }}
                className={`w-full aspect-square rounded-md border transition-transform cursor-pointer ${
                  active
                    ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#1B1D24] scale-105 border-white'
                    : 'border-slate-500/30 hover:scale-105'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Favorites & Recent */}
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-medium text-[#8E96A8] mb-1">Favorites</div>
          <div className="flex flex-wrap gap-1">
            {settings.favoriteColors.length === 0 ? (
              <span className="text-[11px] text-[#6B7280]">None</span>
            ) : (
              settings.favoriteColors.slice(0, 6).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Favorite color ${hex}`}
                  onClick={() => {
                    onChangeColor(hex);
                    onClose();
                  }}
                  style={{ backgroundColor: hex }}
                  className="w-5 h-5 rounded border border-slate-500/40 cursor-pointer"
                />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-[#8E96A8] mb-1">Recent</div>
          <div className="flex flex-wrap gap-1">
            {settings.recentColors.slice(0, 6).map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Recent color ${hex}`}
                onClick={() => {
                  onChangeColor(hex);
                  onClose();
                }}
                style={{ backgroundColor: hex }}
                className="w-5 h-5 rounded border border-slate-500/40 cursor-pointer"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Custom Picker, HEX & RGB Inputs */}
      <div
        className={`mt-2.5 pt-2.5 border-t space-y-2 ${
          isDark ? 'border-[#2D313D]' : 'border-[#E5E8F0]'
        }`}
      >
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="proscreen-custom-color">
            Custom color picker
          </label>
          <input
            id="proscreen-custom-color"
            type="color"
            aria-label="Custom color picker"
            value={normalizeHex(currentColor) ?? '#2563EB'}
            onChange={(e) => onChangeColor(e.target.value.toUpperCase())}
            onBlur={onClose}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
          />
          <div className="flex-1">
            <label htmlFor="proscreen-hex-input" className="block text-[10px] text-[#8E96A8]">
              HEX
            </label>
            <input
              id="proscreen-hex-input"
              type="text"
              aria-label="HEX color input"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onClose();
                }
              }}
              onBlur={onClose}
              className={`w-full px-2 py-1 text-xs font-mono rounded border ${
                isDark
                  ? 'bg-[#14161C] border-[#313644] text-[#E4E7EF]'
                  : 'bg-[#F6F8FB] border-[#CBD2E1] text-[#181B22]'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch}>
              <label
                htmlFor={`proscreen-rgb-${ch}`}
                className="block text-[10px] uppercase text-[#8E96A8]"
              >
                {ch}
              </label>
              <input
                id={`proscreen-rgb-${ch}`}
                type="number"
                aria-label={`RGB ${ch.toUpperCase()} channel`}
                min={0}
                max={255}
                value={rgb[ch]}
                onChange={(e) => handleRgbChannel(ch, e.target.value)}
                className={`w-full px-2 py-1 text-xs font-mono tabular-nums rounded border ${
                  isDark
                    ? 'bg-[#14161C] border-[#313644] text-[#E4E7EF]'
                    : 'bg-[#F6F8FB] border-[#CBD2E1] text-[#181B22]'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Shape Fill Controls when a shape tool is active */}
      {isShape && (
        <div
          className={`mt-2.5 pt-2.5 border-t space-y-2 ${
            isDark ? 'border-[#2D313D]' : 'border-[#E5E8F0]'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Shape Fill</span>
            <input
              type="color"
              aria-label="Shape fill color"
              value={settings.shape.fillColor}
              onChange={(e) =>
                onUpdateShapeFill(e.target.value.toUpperCase(), settings.shape.fillOpacity)
              }
              className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-[#8E96A8]">
              <span>Fill Opacity</span>
              <span className="font-mono tabular-nums">
                {Math.round(settings.shape.fillOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Shape fill opacity"
              min={0}
              max={90}
              value={Math.round(settings.shape.fillOpacity * 100)}
              onChange={(e) =>
                onUpdateShapeFill(settings.shape.fillColor, Number(e.target.value) / 100)
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
