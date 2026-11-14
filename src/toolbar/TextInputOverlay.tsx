import React, { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  GripVertical,
  Italic,
  Trash2,
} from 'lucide-react';
import { TextAnnotation } from '../types/annotation';
import { PRESET_COLORS } from '../utils/color';

interface TextInputOverlayProps {
  items: TextAnnotation[];
  visible: boolean;
  editingId: string | null;
  selectedId: string | null;
  activeTool: string;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onFinishEdit: () => void;
  onUpdate: (item: TextAnnotation) => void;
  onDelete: (id: string) => void;
}

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'DM Sans',
  'JetBrains Mono',
  'Georgia',
  'Arial',
];

export const TextInputOverlay: React.FC<TextInputOverlayProps> = ({
  items,
  visible,
  editingId,
  selectedId,
  activeTool,
  onSelect,
  onStartEdit,
  onFinishEdit,
  onUpdate,
  onDelete,
}) => {
  const [dragState, setDragState] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [scroll, setScroll] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? window.scrollX : 0,
    y: typeof window !== 'undefined' ? window.scrollY : 0,
  }));

  React.useEffect(() => {
    const onScroll = () => {
      setScroll({ x: window.scrollX || 0, y: window.scrollY || 0 });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible || items.length === 0) return null;

  const interactive = activeTool === 'text' || activeTool === 'select';

  return (
    <div
      data-testid="text-annotations-layer"
      className="fixed inset-0 z-[2147483620] pointer-events-none"
    >
      {items.map((item) => {
        const isEditing = editingId === item.id;
        const isSelected = selectedId === item.id || isEditing;
        const isDocSpace = item.coordSpace === 'document';
        const viewX = isDocSpace ? item.x - scroll.x : item.x;
        const viewY = isDocSpace ? item.y - scroll.y : item.y;
        const align = item.align ?? 'left';

        const handleDragStart = (e: React.PointerEvent) => {
          e.stopPropagation();
          onSelect(item.id);
          setDragState({
            id: item.id,
            offsetX: e.clientX - viewX,
            offsetY: e.clientY - viewY,
          });
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        };

        const handleDragMove = (e: React.PointerEvent) => {
          if (!dragState || dragState.id !== item.id) return;
          e.stopPropagation();
          const nextViewX = Math.max(8, Math.min(window.innerWidth - 120, e.clientX - dragState.offsetX));
          const nextViewY = Math.max(8, Math.min(window.innerHeight - 40, e.clientY - dragState.offsetY));
          onUpdate({
            ...item,
            x: isDocSpace ? nextViewX + scroll.x : nextViewX,
            y: isDocSpace ? nextViewY + scroll.y : nextViewY,
          });
        };

        const handleDragEnd = () => {
          if (dragState?.id === item.id) {
            setDragState(null);
          }
        };

        return (
          <div
            key={item.id}
            data-testid={`text-item-${item.id}`}
            style={{
              left: viewX,
              top: viewY,
            }}
            className={`absolute ${
              interactive ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {isEditing && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mb-1.5 flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/95 text-slate-100 border border-slate-700 shadow-lg backdrop-blur-md"
              >
                <button
                  type="button"
                  onPointerDown={handleDragStart}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  aria-label="Drag text annotation"
                  title="Drag to reposition"
                  className="p-1 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
                <select
                  aria-label="Font family"
                  value={item.fontFamily}
                  onChange={(e) => onUpdate({ ...item, fontFamily: e.target.value })}
                  className="bg-slate-800 text-slate-100 text-xs rounded px-1.5 py-1 border border-slate-700"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  aria-label="Font size"
                  min={12}
                  max={72}
                  value={item.fontSize}
                  onChange={(e) =>
                    onUpdate({
                      ...item,
                      fontSize: Math.max(12, Math.min(72, Number(e.target.value) || 20)),
                    })
                  }
                  className="w-12 bg-slate-800 text-slate-100 text-xs font-mono tabular-nums rounded px-1.5 py-1 border border-slate-700"
                />
                <button
                  type="button"
                  aria-label="Toggle bold"
                  aria-pressed={item.bold}
                  onClick={() => onUpdate({ ...item, bold: !item.bold })}
                  className={`p-1 rounded transition-colors ${
                    item.bold ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Toggle italic"
                  aria-pressed={item.italic}
                  onClick={() => onUpdate({ ...item, italic: !item.italic })}
                  className={`p-1 rounded transition-colors ${
                    item.italic ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Align left"
                  aria-pressed={align === 'left'}
                  onClick={() => onUpdate({ ...item, align: 'left' })}
                  className={`p-1 rounded transition-colors ${
                    align === 'left' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Align center"
                  aria-pressed={align === 'center'}
                  onClick={() => onUpdate({ ...item, align: 'center' })}
                  className={`p-1 rounded transition-colors ${
                    align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Align right"
                  aria-pressed={align === 'right'}
                  onClick={() => onUpdate({ ...item, align: 'right' })}
                  className={`p-1 rounded transition-colors ${
                    align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <label className="flex items-center gap-1 text-[11px] text-slate-300" title="Text color">
                  <span className="inline-flex p-0.5 rounded border border-slate-600 bg-slate-800">
                    <input
                      type="color"
                      aria-label="Text color"
                      value={item.color}
                      onChange={(e) => onUpdate({ ...item, color: e.target.value.toUpperCase() })}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </span>
                </label>
                <select
                  aria-label="Text background"
                  value={item.backgroundColor}
                  onChange={(e) => onUpdate({ ...item, backgroundColor: e.target.value })}
                  className="bg-slate-800 text-slate-100 text-xs rounded px-1.5 py-1 border border-slate-700"
                >
                  <option value="transparent">No Fill</option>
                  <option value="#FFFFFF">White Fill</option>
                  <option value="#0F172A">Dark Fill</option>
                  <option value="#FEF08A">Yellow Note</option>
                  {PRESET_COLORS.slice(0, 6).map((c) => (
                    <option key={c.hex} value={c.hex}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Delete text"
                  onClick={() => onDelete(item.id)}
                  className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                  title="Delete text annotation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Finish editing text"
                  onClick={() => {
                    if (!item.text.trim()) {
                      onDelete(item.id);
                    } else {
                      onFinishEdit();
                    }
                  }}
                  className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                  title="Done"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isEditing ? (
              <textarea
                autoFocus
                ref={(el) => {
                  if (el && document.activeElement !== el) {
                    el.focus();
                  }
                }}
                aria-label="Text annotation input"
                placeholder="Type annotation..."
                value={item.text}
                onChange={(e) => onUpdate({ ...item, text: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    if (!item.text.trim()) onDelete(item.id);
                    else onFinishEdit();
                  }
                }}
                style={{
                  fontFamily: item.fontFamily,
                  fontSize: `${item.fontSize}px`,
                  fontWeight: item.bold ? 700 : 500,
                  fontStyle: item.italic ? 'italic' : 'normal',
                  textAlign: align,
                  color: item.color,
                  backgroundColor:
                    item.backgroundColor === 'transparent' ? 'rgba(15,23,42,0.06)' : item.backgroundColor,
                  pointerEvents: 'auto',
                }}
                rows={Math.max(1, item.text.split('\n').length)}
                className="min-w-[180px] px-2.5 py-1.5 rounded-lg border-2 border-blue-500 outline-none shadow-md resize pointer-events-auto"
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(item.id);
                }}
                onPointerDown={activeTool === 'text' || activeTool === 'select' ? handleDragStart : undefined}
                onPointerMove={activeTool === 'text' || activeTool === 'select' ? handleDragMove : undefined}
                onPointerUp={activeTool === 'text' || activeTool === 'select' ? handleDragEnd : undefined}
                style={{
                  fontFamily: item.fontFamily,
                  fontSize: `${item.fontSize}px`,
                  fontWeight: item.bold ? 700 : 500,
                  fontStyle: item.italic ? 'italic' : 'normal',
                  textAlign: align,
                  color: item.color,
                  backgroundColor: item.backgroundColor,
                }}
                title="Double-click to edit, drag to move"
                className={`px-2.5 py-1 rounded-lg whitespace-pre-wrap select-none transition-shadow ${
                  activeTool === 'text' || activeTool === 'select' ? 'cursor-move' : 'cursor-default'
                } ${
                  isSelected && (activeTool === 'text' || activeTool === 'select')
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : ''
                }`}
              >
                {item.text || 'Empty label'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
