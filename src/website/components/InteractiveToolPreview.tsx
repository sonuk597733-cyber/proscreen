import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Highlighter,
  ArrowUpRight,
  Square,
  Circle,
  Type,
  Eraser,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  Presentation,
  Camera,
  Video,
  MousePointer,
  Sparkles,
  Maximize2,
  Trash2,
  Check,
} from 'lucide-react';

interface Stroke {
  id: string;
  tool: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  fill?: boolean;
}

export const InteractiveToolPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<string>('pen');
  const [activeColor, setActiveColor] = useState<string>('#3B82F6');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [backdropMode, setBackdropMode] = useState<'desktop' | 'whiteboard' | 'blackboard'>('desktop');
  const [isEyeOff, setIsEyeOff] = useState<boolean>(false);
  const [eyeButtonPos, setEyeButtonPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDraggingEye, setIsDraggingEye] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>([
    {
      id: 'init-1',
      tool: 'pen',
      color: '#3B82F6',
      size: 4,
      points: [
        { x: 120, y: 150 },
        { x: 140, y: 130 },
        { x: 180, y: 120 },
        { x: 230, y: 135 },
        { x: 260, y: 170 },
      ],
    },
    {
      id: 'init-2',
      tool: 'highlighter',
      color: '#FACC15',
      size: 16,
      points: [
        { x: 300, y: 220 },
        { x: 500, y: 220 },
      ],
    },
    {
      id: 'init-3',
      tool: 'arrow',
      color: '#10B981',
      size: 4,
      points: [
        { x: 280, y: 290 },
        { x: 420, y: 230 },
      ],
    },
    {
      id: 'init-4',
      tool: 'text',
      color: '#FFFFFF',
      size: 18,
      points: [{ x: 440, y: 235 }],
      text: '← Zero-Latency Engine',
    },
  ]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const colors = [
    '#3B82F6', // Electric Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#A855F7', // Purple
    '#EC4899', // Pink
    '#FACC15', // Yellow (Highlighter default)
    '#FFFFFF', // White
  ];

  // Draw on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Render strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    allStrokes.forEach((st) => {
      ctx.save();
      ctx.lineWidth = st.size;
      ctx.strokeStyle = st.color;
      ctx.fillStyle = st.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (st.tool === 'highlighter') {
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(14, st.size * 2.5);
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (st.points.length === 0) {
        ctx.restore();
        return;
      }

      if (st.tool === 'pen' || st.tool === 'highlighter') {
        ctx.beginPath();
        ctx.moveTo(st.points[0].x, st.points[0].y);
        for (let i = 1; i < st.points.length; i++) {
          ctx.lineTo(st.points[i].x, st.points[i].y);
        }
        ctx.stroke();
      } else if (st.tool === 'arrow') {
        if (st.points.length >= 2) {
          const from = st.points[0];
          const to = st.points[st.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const headLen = Math.max(12, st.size * 3.5);
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      } else if (st.tool === 'rectangle') {
        if (st.points.length >= 2) {
          const from = st.points[0];
          const to = st.points[st.points.length - 1];
          const w = to.x - from.x;
          const h = to.y - from.y;
          ctx.strokeRect(from.x, from.y, w, h);
        }
      } else if (st.tool === 'circle') {
        if (st.points.length >= 2) {
          const from = st.points[0];
          const to = st.points[st.points.length - 1];
          const rx = Math.abs(to.x - from.x) / 2;
          const ry = Math.abs(to.y - from.y) / 2;
          const cx = Math.min(from.x, to.x) + rx;
          const cy = Math.min(from.y, to.y) + ry;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (st.tool === 'text') {
        ctx.font = '600 16px "DM Sans", -apple-system, sans-serif';
        ctx.fillStyle = st.color;
        ctx.fillText(st.text || 'Annotated Note', st.points[0].x, st.points[0].y);
      }

      ctx.restore();
    });
  }, [strokes, currentStroke, backdropMode]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pointer') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      // Find and remove stroke near x,y
      setHistory((prev) => [...prev, strokes]);
      setRedoStack([]);
      setStrokes((prev) =>
        prev.filter((st) => {
          return !st.points.some((p) => Math.hypot(p.x - x, p.y - y) < 24);
        })
      );
      return;
    }

    if (activeTool === 'text') {
      const text = prompt('Enter annotation text:', 'Key Architectural Insight');
      if (text) {
        setHistory((prev) => [...prev, strokes]);
        setRedoStack([]);
        setStrokes((prev) => [
          ...prev,
          {
            id: `text-${Date.now()}`,
            tool: 'text',
            color: activeColor,
            size: strokeWidth,
            points: [{ x, y }],
            text,
          },
        ]);
      }
      return;
    }

    setCurrentStroke({
      id: `stroke-${Date.now()}`,
      tool: activeTool,
      color: activeColor,
      size: strokeWidth,
      points: [{ x, y }],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, { x, y }] } : null));
    } else {
      // Line/shape: update endpoint
      setCurrentStroke((prev) =>
        prev ? { ...prev, points: [prev.points[0], { x, y }] } : null
      );
    }
  };

  const handlePointerUp = () => {
    if (currentStroke) {
      setHistory((prev) => [...prev, strokes]);
      setRedoStack([]);
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previous);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, strokes]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
  };

  const handleScreenshot = () => {
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2400);
  };

  return (
    <div className="w-full relative rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden group">
      {/* Top Application Bar */}
      <div className="px-4 py-3 bg-[#080d1a] border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs font-mono text-slate-400 font-medium">
            ProScreen Interactive Live Canvas
          </span>
        </div>

        {/* Backdrop Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setBackdropMode('desktop')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              backdropMode === 'desktop'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Desktop App
          </button>
          <button
            onClick={() => setBackdropMode('whiteboard')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              backdropMode === 'whiteboard'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Whiteboard
          </button>
          <button
            onClick={() => setBackdropMode('blackboard')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              backdropMode === 'blackboard'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blackboard
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        className={`relative w-full h-[460px] sm:h-[500px] overflow-hidden select-none transition-colors duration-300 ${
          backdropMode === 'whiteboard'
            ? 'bg-white'
            : backdropMode === 'blackboard'
            ? 'bg-[#15171C]'
            : 'bg-[#0B1021]'
        }`}
      >
        {/* Background Simulated Content (Desktop Mode) */}
        {backdropMode === 'desktop' && (
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
                  IDE
                </div>
                <div>
                  <div className="text-sm font-semibold text-white font-mono">
                    telemetryPipeline.worker.ts
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ProScreen High-Frequency Direct3D Overlay
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                  60 FPS
                </span>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  Pass-Through Ready
                </span>
              </div>
            </div>

            {/* Code Snippet lines */}
            <div className="space-y-2 font-mono text-xs text-slate-300 my-auto pl-2 border-l-2 border-blue-500/40">
              <div className="text-purple-400">
                export async function <span className="text-blue-400">renderScreenOverlay</span>(bounds: VirtualBounds) {'{'}
              </div>
              <div className="pl-4 text-slate-400">
                // Epic Pen Style: mouse clicks pass cleanly to underlying desktop
              </div>
              <div className="pl-4 text-emerald-400">
                const overlay = window.proscreenDesktop.setIgnoreMouseEvents(true);
              </div>
              <div className="pl-4 text-sky-300">
                await hardwarePipeline.dispatchBezierStroke(points, color);
              </div>
              <div className="text-purple-400">{'}'}</div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800">
              <span>Status: Zero-Latency Overlay Active</span>
              <span className="font-mono">Coordinates: [X: 1920, Y: 1080]</span>
            </div>
          </div>
        )}

        {/* Whiteboard grid backdrop */}
        {backdropMode === 'whiteboard' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {/* Blackboard grid backdrop */}
        {backdropMode === 'blackboard' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {/* Interactive HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-0 w-full h-full z-10 ${
            activeTool === 'pointer'
              ? 'cursor-default pointer-events-none'
              : activeTool === 'pen'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-not-allowed'
              : 'cursor-crosshair'
          }`}
        />

        {/* ProScreen Floating Toolbar (Shown when Eye is ON) */}
        {!isEyeOff && (
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 p-2 bg-[#090E1D]/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 animate-fadeIn">
            {/* Pointer / Pass-Through */}
            <button
              onClick={() => setActiveTool('pointer')}
              title="Pointer Mode (Pass-Through to Desktop) [Alt+V]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'pointer'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MousePointer className="w-4 h-4" />
            </button>

            {/* Pen */}
            <button
              onClick={() => setActiveTool('pen')}
              title="Pen Tool [Alt+P]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'pen'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
            </button>

            {/* Highlighter */}
            <button
              onClick={() => setActiveTool('highlighter')}
              title="Chisel Highlighter [Alt+H]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Highlighter className="w-4 h-4" />
            </button>

            {/* Arrow */}
            <button
              onClick={() => setActiveTool('arrow')}
              title="Arrow Callout Tool [Alt+A]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'arrow'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>

            {/* Rectangle */}
            <button
              onClick={() => setActiveTool('rectangle')}
              title="Rectangle Tool [Alt+R]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'rectangle'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Circle */}
            <button
              onClick={() => setActiveTool('circle')}
              title="Circle Tool"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'circle'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Circle className="w-4 h-4" />
            </button>

            {/* Text */}
            <button
              onClick={() => setActiveTool('text')}
              title="Text Callout [Alt+T]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Eraser */}
            <button
              onClick={() => setActiveTool('eraser')}
              title="Precision Eraser [Alt+E]"
              className={`p-2.5 rounded-xl transition-all ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <div className="w-full h-[1px] bg-slate-800 my-1" />

            {/* Eye OFF Toggle (Epic Pen Style Collapse) */}
            <button
              onClick={() => setIsEyeOff(true)}
              title="Eye OFF: Collapse Toolbar & keep drawings visible [Alt+Shift+P]"
              className="p-2.5 rounded-xl text-slate-400 hover:text-sky-300 hover:bg-sky-950/40 transition-all group/eye"
            >
              <Eye className="w-4 h-4 text-sky-400 group-hover/eye:scale-110 transition-transform" />
            </button>

            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo [Ctrl+Z]"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Screenshot */}
            <button
              onClick={handleScreenshot}
              title="Capture Screenshot to Clipboard [Alt+Shift+S]"
              className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Clear All */}
            <button
              onClick={handleClear}
              title="Clear Canvas [Alt+Shift+X]"
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Color & Size Panel */}
        {!isEyeOff && activeTool !== 'pointer' && (
          <div className="absolute top-4 left-20 z-20 p-2.5 bg-[#090E1D]/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex items-center gap-2 animate-fadeIn">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    activeColor === c
                      ? 'scale-125 ring-2 ring-blue-400 ring-offset-2 ring-offset-[#090E1D]'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <div className="h-5 w-[1px] bg-slate-800 mx-1" />

            {/* Thickness selector */}
            <div className="flex items-center gap-1">
              {[2, 4, 8, 16].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                    strokeWidth === w
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Floating Eye Restore Button (Epic Pen Style) */}
        {isEyeOff && (
          <div
            style={{
              left: `${eyeButtonPos.x}px`,
              top: `${eyeButtonPos.y}px`,
            }}
            onPointerDown={(e) => {
              setIsDraggingEye(true);
              setDragOffset({
                x: e.clientX - eyeButtonPos.x,
                y: e.clientY - eyeButtonPos.y,
              });
            }}
            onPointerMove={(e) => {
              if (!isDraggingEye) return;
              setEyeButtonPos({
                x: Math.max(10, Math.min(600, e.clientX - dragOffset.x)),
                y: Math.max(10, Math.min(420, e.clientY - dragOffset.y)),
              });
            }}
            onPointerUp={() => setIsDraggingEye(false)}
            className="absolute z-30 flex items-center gap-2 p-1.5 bg-[#0B1226]/95 border-2 border-blue-500 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.5)] cursor-move select-none animate-fadeIn"
          >
            <button
              onClick={() => setIsEyeOff(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
              title="Click to restore ProScreen toolbar"
            >
              <EyeOff className="w-4 h-4 animate-pulse text-sky-200" />
              <span>Restore Toolbar</span>
            </button>
            <span className="text-[10px] text-blue-300 font-mono pr-2">
              (Annotations Preserved)
            </span>
          </div>
        )}

        {/* Screenshot notification toast */}
        {copiedNotification && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-2xl animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Annotated screenshot copied to clipboard (PNG ready)!</span>
          </div>
        )}

        {/* Bottom Helper Bar */}
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-3 text-[11px] font-mono text-slate-400 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Strokes: {strokes.length}</span>
          <span>•</span>
          <span>Mode: {activeTool.toUpperCase()}</span>
          <span>•</span>
          <span className="text-blue-400">Click & Drag to Draw</span>
        </div>
      </div>
    </div>
  );
};
