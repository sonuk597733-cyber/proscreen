import { AnnotationItem, BoardMode } from '../types/annotation';
import { renderAnnotationLayer } from '../canvas/renderer';
import { isExtensionContext } from '../utils/env';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureResult {
  ok: boolean;
  dataUrl?: string;
  width?: number;
  height?: number;
  byteLength?: number;
  error?: string;
  note?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode captured image frame.'));
    img.src = src;
  });
}

function drawBoardBackgroundOnCanvas(
  ctx: CanvasRenderingContext2D,
  mode: Exclude<BoardMode, 'webpage'>,
  vw: number,
  vh: number,
  showGrid: boolean
) {
  if (mode === 'whiteboard') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, vw, vh);
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < vw; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, vh);
        ctx.stroke();
      }
      for (let gy = 0; gy < vh; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(vw, gy);
        ctx.stroke();
      }
    }
  } else if (mode === 'blackboard') {
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, vw, vh);
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < vw; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, vh);
        ctx.stroke();
      }
      for (let gy = 0; gy < vh; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(vw, gy);
        ctx.stroke();
      }
    }
  } else if (mode === 'grid-paper') {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.10)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < vw; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, vh);
      ctx.stroke();
    }
    for (let gy = 0; gy < vh; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(vw, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.20)';
    for (let gx = 0; gx < vw; gx += 96) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, vh);
      ctx.stroke();
    }
    for (let gy = 0; gy < vh; gy += 96) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(vw, gy);
      ctx.stroke();
    }
  } else if (mode === 'ruled-notebook') {
    ctx.fillStyle = '#FFFDF6';
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.18)';
    ctx.lineWidth = 1;
    for (let gy = 32; gy < vh; gy += 32) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(vw, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.30)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(69, 0);
    ctx.lineTo(69, vh);
    ctx.stroke();
  }
}

const INLINE_STYLE_KEYS = [
  'display',
  'position',
  'boxSizing',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'margin',
  'padding',
  'backgroundColor',
  'color',
  'opacity',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'border',
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'borderRadius',
  'boxShadow',
  'gap',
  'gridTemplateColumns',
  'gridColumn',
  'gridRow',
  'flexDirection',
  'flexWrap',
  'flexGrow',
  'flexShrink',
  'alignItems',
  'alignSelf',
  'justifyContent',
  'justifySelf',
  'overflow',
  'whiteSpace',
] as const;

function cloneWithComputedStyles(src: HTMLElement): HTMLElement {
  const clone = src.cloneNode(false) as HTMLElement;
  const computed = window.getComputedStyle(src);
  for (const key of INLINE_STYLE_KEYS) {
    const val = computed[key];
    if (val) {
      clone.style[key] = val;
    }
  }

  for (const child of Array.from(src.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      clone.appendChild(child.cloneNode(false));
      continue;
    }
    if (child instanceof HTMLElement) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'iframe' || tag === 'video') continue;
      if (tag === 'img') {
        const imgEl = child as HTMLImageElement;
        if (imgEl.src && !imgEl.src.startsWith('data:')) {
          // Replace external image with safe non-tainting placeholder block during standalone web rasterization
          const box = document.createElement('div');
          box.style.width = `${imgEl.clientWidth || 120}px`;
          box.style.height = `${imgEl.clientHeight || 80}px`;
          box.style.background = '#E2E8F0';
          box.style.borderRadius = '8px';
          clone.appendChild(box);
          continue;
        }
      }
      clone.appendChild(cloneWithComputedStyles(child));
    }
  }
  return clone;
}

async function rasterizePreviewElement(
  el: HTMLElement,
  width: number,
  height: number
): Promise<HTMLImageElement | null> {
  try {
    const styledClone = cloneWithComputedStyles(el);
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const serialized = new XMLSerializer().serializeToString(styledClone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#ffffff;transform:translate(${-scrollX}px,${-scrollY}px);">${serialized}</div></foreignObject></svg>`;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const timeoutFallback = new Promise<null>((resolve) =>
      window.setTimeout(() => resolve(null), 900)
    );
    return await Promise.race([loadImage(url), timeoutFallback]);
  } catch {
    return null;
  }
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Captures the visible viewport + annotations (and optionally crops to a selected region).
 * Uses chrome.tabs.captureVisibleTab in Chrome Extension context, or composites the active
 * styled page DOM + annotation layer cleanly in standalone preview mode.
 */
export async function captureAnnotatedScreenshot(params: {
  items: AnnotationItem[];
  boardMode: BoardMode;
  whiteboardGrid: boolean;
  backgroundImageDataUrl?: string;
  crop?: CropRect | null;
  backdropElement?: HTMLElement | null;
}): Promise<CaptureResult> {
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const crop: CropRect =
    params.crop && params.crop.width >= 12 && params.crop.height >= 12
      ? {
          x: Math.max(0, Math.min(vw - 1, params.crop.x)),
          y: Math.max(0, Math.min(vh - 1, params.crop.y)),
          width: Math.min(vw - Math.max(0, params.crop.x), params.crop.width),
          height: Math.min(vh - Math.max(0, params.crop.y), params.crop.height),
        }
      : { x: 0, y: 0, width: vw, height: vh };

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = Math.round(vw * dpr);
  fullCanvas.height = Math.round(vh * dpr);
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) {
    return { ok: false, error: 'Unable to initialize 2D graphics context for screenshot export.' };
  }

  let captureNote: string | undefined;

  if (isExtensionContext() && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<{ ok: boolean; dataUrl?: string; error?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(res ?? { ok: false, error: 'No response from background capture service.' });
        });
      });

      if (!response.ok || !response.dataUrl) {
        return {
          ok: false,
          error:
            response.error ||
            'Browser capture permission denied or current tab cannot be captured by Chrome.',
        };
      }

      const tabImg = await loadImage(response.dataUrl);
      fullCtx.drawImage(tabImg, 0, 0, fullCanvas.width, fullCanvas.height);
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to capture Chrome tab due to browser security restrictions.',
      };
    }
  } else {
    let desktopCaptured = false;
    if (typeof window !== 'undefined' && window.proscreenDesktop?.captureScreenThumbnail && params.boardMode === 'webpage') {
      try {
        const thumb = await window.proscreenDesktop.captureScreenThumbnail();
        if (thumb) {
          const thumbImg = await loadImage(thumb);
          fullCtx.drawImage(thumbImg, 0, 0, fullCanvas.width, fullCanvas.height);
          desktopCaptured = true;
        }
      } catch {
        // Fallback to backdrop rasterizer
      }
    }

    if (!desktopCaptured) {
      fullCtx.scale(dpr, dpr);
      if (params.boardMode !== 'webpage') {
        drawBoardBackgroundOnCanvas(fullCtx, params.boardMode, vw, vh, params.whiteboardGrid);
        if (params.backgroundImageDataUrl) {
          try {
            const bgImg = await loadImage(params.backgroundImageDataUrl);
            const scale = Math.min(vw / bgImg.width, vh / bgImg.height);
            const drawW = bgImg.width * scale;
            const drawH = bgImg.height * scale;
            fullCtx.drawImage(bgImg, (vw - drawW) / 2, (vh - drawH) / 2, drawW, drawH);
          } catch {
            // Ignore malformed background image
          }
        }
      } else {
        fullCtx.fillStyle = '#FFFFFF';
        fullCtx.fillRect(0, 0, vw, vh);
        if (params.backdropElement) {
          const cloned = await rasterizePreviewElement(params.backdropElement, vw, vh);
          if (cloned) {
            fullCtx.drawImage(cloned, 0, 0, vw, vh);
          } else {
            captureNote =
              'Captured annotation composite. Full arbitrary webpage pixel capture uses chrome.tabs.captureVisibleTab in the loaded Chrome Extension.';
          }
        }
      }
    }

    // Draw annotations + text on top
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = Math.round(vw * dpr);
    overlayCanvas.height = Math.round(vh * dpr);
    const oCtx = overlayCanvas.getContext('2d');
    if (oCtx) {
      oCtx.scale(dpr, dpr);
      renderAnnotationLayer(oCtx, vw, vh, params.items, {
        nowMs: Date.now(),
        boardMode: params.boardMode,
        annotationsVisible: true,
        scroll: { x: window.scrollX || 0, y: window.scrollY || 0 },
        includeTextOnCanvas: true,
      });
      fullCtx.setTransform(1, 0, 0, 1, 0, 0);
      fullCtx.drawImage(overlayCanvas, 0, 0);
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.round(crop.width * dpr);
  outCanvas.height = Math.round(crop.height * dpr);
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    return { ok: false, error: 'Failed to crop captured screenshot.' };
  }

  outCtx.drawImage(
    fullCanvas,
    Math.round(crop.x * dpr),
    Math.round(crop.y * dpr),
    Math.round(crop.width * dpr),
    Math.round(crop.height * dpr),
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );

  try {
    const dataUrl = outCanvas.toDataURL('image/png');
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) {
      return { ok: false, error: 'Generated screenshot image was invalid.' };
    }
    return {
      ok: true,
      dataUrl,
      width: Math.round(crop.width),
      height: Math.round(crop.height),
      byteLength: estimateDataUrlBytes(dataUrl),
      note: captureNote,
    };
  } catch {
    return {
      ok: false,
      error:
        'Browser security (tainted canvas from cross-origin media) blocked PNG export. Use the Chrome Extension build for tab pixel capture.',
    };
  }
}

export async function downloadPngDataUrl(
  dataUrl: string,
  filename: string,
  saveAs = false
): Promise<{ ok: boolean; filename?: string; error?: string }> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'Invalid screenshot image payload.' };
  }
  if (isExtensionContext() && chrome.runtime?.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'DOWNLOAD_PNG', dataUrl, filename, saveAs }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res ?? { ok: true, filename });
      });
    });
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { ok: true, filename };
}

export async function copyPngToClipboard(dataUrl: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return {
      ok: false,
      error: 'Clipboard image API is unavailable in this browser context. Use Download PNG instead.',
    };
  }
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Clipboard permission blocked: ${err.message}`
          : 'Clipboard write was blocked by browser permissions.',
    };
  }
}
