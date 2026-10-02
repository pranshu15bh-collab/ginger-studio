// ai.js — the "AI" layer, entirely local. No key, no network.
//  - voice: the browser Speech API (mic -> text)
//  - background removal: corner flood-fill on an offscreen canvas
// Both say when they cannot run; neither fails silently.

// ------------------------------------------------------------------ voice
export function speechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startDictation({ onText, onEnd, onError } = {}) {
  if (!speechSupported()) {
    onError && onError('Voice input is not available in this browser. Type instead — everything works without it.');
    return () => {};
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'en-IN';
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t; else interim += t;
    }
    onText && onText(finalText + interim, !!finalText);
  };
  rec.onerror = (e) => { onError && onError(e.error === 'not-allowed' ? 'Microphone permission was refused. Type instead.' : 'Voice stopped (' + e.error + '). Type instead.'); };
  rec.onend = () => onEnd && onEnd(finalText);
  try { rec.start(); } catch (e) { onError && onError('Could not start the microphone. Type instead.'); return () => {}; }
  return () => { try { rec.stop(); } catch (e) { /* already stopped */ } };
}

// ------------------------------------------------------------------ files
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

export function imageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = src;
  });
}

// ------------------------------------------------------------------ background removal
/** Flood-fills each corner with a tolerance and makes matched pixels transparent.
 *  Honest local removal: correct for a logo on a flat/near-flat background. */
export function removeBackground(src, tolerance = 34, maxEdge = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, cw, ch);
      let data;
      try { data = ctx.getImageData(0, 0, cw, ch); } catch (e) { reject(new Error('This image cannot be processed in the browser (CORS).')); return; }
      const px = data.data;
      const idx = (x, y) => (y * cw + x) * 4;
      const near = (i, r, g, b) => Math.abs(px[i] - r) + Math.abs(px[i + 1] - g) + Math.abs(px[i + 2] - b) <= tolerance * 3;
      const corners = [[0, 0], [cw - 1, 0], [0, ch - 1], [cw - 1, ch - 1]].map(([x, y]) => {
        const i = idx(x, y); return { r: px[i], g: px[i + 1], b: px[i + 2] };
      });
      const visited = new Uint8Array(cw * ch);
      const stack = [];
      corners.forEach(([x, y], ci) => { stack.push([x, y]); });
      // BFS
      const q = [];
      [[0, 0], [cw - 1, 0], [0, ch - 1], [cw - 1, ch - 1]].forEach(([x, y]) => q.push(x, y));
      let head = 0;
      while (head < q.length) {
        const x = q[head++], y = q[head++];
        if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
        const vi = y * cw + x;
        if (visited[vi]) continue;
        const i = idx(x, y);
        if (px[i + 3] === 0) { visited[vi] = 1; continue; }
        const match = corners.some((c) => near(i, c.r, c.g, c.b));
        if (!match) continue;
        visited[vi] = 1;
        px[i + 3] = 0;
        q.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }
      ctx.putImageData(data, 0, 0);
      resolve(cv.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('That image could not be loaded.'));
    img.src = src;
  });
}

/** Rasterise an SVG string to a PNG data URL at a scale (for downloads). */
export function svgToPng(svgMarkup, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(width * scale); cv.height = Math.round(height * scale);
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not render the artwork.')); };
    img.src = url;
  });
}
