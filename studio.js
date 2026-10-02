// studio.js — the design canvas. One SVG per garment, elements as SVG, direct
// manipulation with pointer events. Reads state; writes via store on gesture end.
import { CANVAS, productById, colourById } from './data.js';
import * as R from './rules.js';

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = (n) => Math.round(n * 100) / 100;
// Inline SVGs share the document id space, so every SVG instance needs unique defs ids.
let gidc = 0;
const nid = () => 'gs' + (++gidc);

function shadeForProduct(p, colourHex) {
  // darker overlay for shading; works for light and dark garments
  const dark = colourById(p).dark ? 0.22 : 0.12;
  return `rgba(0,0,0,${dark})`;
}

function extrasMarkup(p, view, colourHex) {
  const v = p.views[view];
  const out = [];
  if (v.hood) out.push(`<ellipse cx="320" cy="196" rx="128" ry="74" fill="rgba(0,0,0,.16)"/>`);
  if (v.brim) out.push(`<ellipse cx="320" cy="352" rx="196" ry="32" fill="${shadeForProduct(p, colourHex)}"/>`);
  if (v.collar) {
    if (p.id === 'polo') {
      out.push(`<path d="M262,132 L320,196 L378,132 L356,124 L320,168 L284,124 Z" fill="rgba(255,255,255,.10)"/>`);
      out.push(`<rect x="308" y="150" width="24" height="86" rx="4" fill="rgba(0,0,0,.12)"/>`);
      out.push(`<circle cx="320" cy="176" r="3" fill="rgba(255,255,255,.5)"/><circle cx="320" cy="206" r="3" fill="rgba(255,255,255,.5)"/>`);
    } else {
      out.push(`<ellipse cx="320" cy="140" rx="60" ry="24" fill="rgba(0,0,0,.10)"/>`);
    }
  }
  if (v.pocket) out.push(`<rect x="238" y="520" width="164" height="96" rx="14" fill="rgba(0,0,0,.07)"/>`);
  return out.join('');
}

function elementBody(el) {
  if (el.type === 'image') {
    const w = Number(el.w) || 120, h = Number(el.h) || 120;
    return `<image href="${esc(el.src)}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  if (el.type === 'shape') {
    const w = Number(el.w) || 120, h = Number(el.h) || 80, c = esc(el.colour || '#E4661E');
    switch (el.shape) {
      case 'rect': return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="${c}"/>`;
      case 'rays': {
        let p = '';
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p += `M0,0 L${r2(Math.cos(a) * w * 0.7)},${r2(Math.sin(a) * h * 1.6)} `; }
        return `<path d="${p}" stroke="${c}" stroke-width="6" opacity=".8"/>`;
      }
      case 'banner': return `<path d="M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2 - 16},0 L${w / 2},${h / 2} L${-w / 2},${h / 2} L${-w / 2 + 16},0 Z" fill="${c}"/>`;
      default: return `<circle cx="0" cy="0" r="${Math.min(w, h) / 2}" fill="${c}"/>`;
    }
  }
  // text (supports \n)
  const lines = String(el.text || '').split('\n');
  const size = Number(el.size) || 40;
  const lh = size * 1.16;
  const startY = -((lines.length - 1) * lh) / 2;
  return `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="${esc(el.font)}" font-size="${size}" fill="${esc(el.colour)}" font-weight="700">${lines.map((l, i) => `<tspan x="0" dy="${i === 0 ? startY : lh}">${esc(l)}</tspan>`).join('')}</text>`;
}

function elementGroup(el, { transform = true } = {}) {
  const s = Number(el.scale) || 1;
  const rot = Number(el.rotation) || 0;
  const t = transform ? `transform="translate(${r2(el.x)},${r2(el.y)}) rotate(${r2(rot)})"` : '';
  return `<g class="elg" ${t}><g transform="scale(${r2(s)})">${elementBody(el)}</g></g>`;
}

/** Standalone SVG of the whole garment with the design (for the mockup export). */
export function fullSVG(design, productId, colourId, view = 'front') {
  const p = productById(productId);
  const hex = colourById(colourId).hex;
  const pa = p.views[view].printArea;
  const els = R.viewElements(design, view).map((e) => elementGroup(e)).join('');
  const sh = nid(), pc = nid();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}" style="width:100%;height:auto;display:block;max-width:100%">
<defs><linearGradient id="${sh}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
<clipPath id="${pc}"><rect x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}"/></clipPath></defs>
<g><path d="${p.views[view].path}" fill="${hex}" stroke="rgba(0,0,0,.14)" stroke-width="2"/><path d="${p.views[view].path}" fill="url(#${sh})"/>${extrasMarkup(p, view, hex)}</g>
<g clip-path="url(#${pc})">${els}</g></svg>`;
}

/** Print-ready artwork only: transparent background, sized to the print area at a scale. */
export function artworkSVG(design, productId, view = 'front', scale = 4) {
  const pa = R.printAreaFor(productId, view);
  const els = R.viewElements(design, view).map((e) => {
    const t = { ...e, x: e.x - pa.x, y: e.y - pa.y };
    return elementGroup(t);
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pa.w} ${pa.h}" width="${Math.round(pa.w * scale)}" height="${Math.round(pa.h * scale)}"><g>${els}</g></svg>`;
}

// ------------------------------------------------------------------ canvas markup (interactive)
export function studioSVG(state, selectedId) {
  const d = state.currentDraft;
  const p = productById(d.productId);
  const hex = colourById(d.colourId).hex;
  const view = d.activeView;
  const pa = p.views[view].printArea;
  const els = R.viewElements(d, view);

  const clipped = els.map((el) => `<g class="el" data-id="${el.id}">${elementGroup(el, { transform: true })}</g>`).join('');

  let handles = '';
  const sel = els.find((e) => e.id === selectedId);
  if (sel) {
    const base = R.elementSize({ ...sel, scale: 1 });
    const hw = base.w / 2, hh = base.h / 2;
    const rot = Number(sel.rotation) || 0;
    handles = `<g class="handles" transform="translate(${r2(sel.x)},${r2(sel.y)}) rotate(${r2(rot)})">
      <rect class="selbox" x="${-hw}" y="${-hh}" width="${base.w}" height="${base.h}" fill="none" stroke="#E4661E" stroke-width="2" stroke-dasharray="7 6"/>
      <line x1="0" y1="${-hh}" x2="0" y2="${-hh - 30}" stroke="#E4661E" stroke-width="2"/>
      <circle class="handle" data-role="rotate" cx="0" cy="${-hh - 34}" r="13" fill="#fff" stroke="#E4661E" stroke-width="3"/>
      <rect class="handle" data-role="scale" x="${hw - 11}" y="${hh - 11}" width="22" height="22" rx="4" fill="#fff" stroke="#E4661E" stroke-width="3"/>
    </g>`;
  }

  const sh = nid(), pc = nid();
  return `<svg id="canvas" class="canvas" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${sh}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <clipPath id="${pc}"><rect x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}"/></clipPath>
  </defs>
  <g class="garment"><path d="${p.views[view].path}" fill="${hex}" stroke="rgba(0,0,0,.16)" stroke-width="2"/><path d="${p.views[view].path}" fill="url(#${sh})"/>${extrasMarkup(p, view, hex)}</g>
  <g clip-path="url(#${pc})">${clipped}</g>
  <rect class="guide" x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}" fill="none" stroke="rgba(228,102,30,.55)" stroke-width="2" stroke-dasharray="8 7"/>
  <text class="guide-tag" x="${pa.x + 6}" y="${pa.y - 8}" font-size="15" fill="rgba(228,102,30,.85)" font-family="system-ui">print area</text>
  ${handles}
</svg>`;
}

// Update one element's DOM in place (used by the live sliders, without a re-render).
export function refreshElement(svg, state, id) {
  const d = state.currentDraft;
  const el = R.viewElements(d, d.activeView).find((e) => e.id === id);
  if (!el) return;
  const host = svg.querySelector(`.el[data-id="${id}"]`);
  if (host) {
    const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrap.innerHTML = elementGroup(el);
    host.replaceChildren(...wrap.childNodes);
  }
  const h = svg.querySelector('.handles');
  if (h) h.setAttribute('transform', `translate(${r2(el.x)},${r2(el.y)}) rotate(${r2(el.rotation)})`);
}

// ------------------------------------------------------------------ gestures
export function mountStudio(svg, state, { onSelect, onCommit }) {
  if (!svg) return () => {};
  const pt = (evt) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    const t = p.matrixTransform(m.inverse());
    return { x: t.x, y: t.y };
  };
  const draft = () => state.currentDraft;
  const els = () => R.viewElements(draft(), draft().activeView);
  const pa = () => R.printAreaFor(draft().productId, draft().activeView);

  let drag = null;

  const onDown = (evt) => {
    const handle = evt.target.closest && evt.target.closest('.handle');
    const elGroup = evt.target.closest && evt.target.closest('.el');
    if (handle && drag && drag.selId) {
      const el = els().find((e) => e.id === drag.selId);
      if (el) {
        const c = pt(evt);
        drag = { ...drag, mode: handle.dataset.role, el, start: c, startScale: el.scale, startRot: el.rotation };
        svg.setPointerCapture(evt.pointerId);
      }
      return;
    }
    if (!elGroup) { onSelect(null); return; }
    const id = elGroup.dataset.id;
    if (drag && drag.selId === id) {
      const c = pt(evt);
      drag = { ...drag, mode: 'move', start: c, startX: drag.el ? drag.el.x : 0, startY: drag.el ? drag.el.y : 0 };
      svg.setPointerCapture(evt.pointerId);
      return;
    }
    // first tap: select; a subsequent drag moves
    const el = els().find((e) => e.id === id);
    if (el) {
      onSelect(id);
      const c = pt(evt);
      drag = { selId: id, el, mode: null, start: c, startX: el.x, startY: el.y, startScale: el.scale, startRot: el.rotation };
      svg.setPointerCapture(evt.pointerId);
    }
  };

  const groupFor = (id) => svg.querySelector(`.el[data-id="${id}"] .elg`);
  const handlesFor = () => svg.querySelector('.handles');

  const onMove = (evt) => {
    if (!drag || !drag.mode) return;
    const c = pt(evt);
    const g = groupFor(drag.selId);
    if (!g) return;
    if (drag.mode === 'move') {
      const nx = drag.startX + (c.x - drag.start.x);
      const ny = drag.startY + (c.y - drag.start.y);
      const cl = R.clampElement({ ...drag.el, x: nx, y: ny }, pa());
      g.setAttribute('transform', `translate(${cl.x},${cl.y}) rotate(${drag.startRot})`);
      drag.el.x = cl.x; drag.el.y = cl.y;
    } else if (drag.mode === 'scale') {
      const d0 = Math.hypot(drag.start.x - drag.el.x, drag.start.y - drag.el.y) || 1;
      const d1 = Math.hypot(c.x - drag.el.x, c.y - drag.el.y) || 1;
      const s = Math.max(0.3, Math.min(3, drag.startScale * (d1 / d0)));
      drag.el.scale = Math.round(s * 100) / 100;
      g.querySelector('g').setAttribute('transform', `scale(${drag.el.scale})`);
      if (handlesFor()) handlesFor().setAttribute('transform', `translate(${drag.el.x},${drag.el.y}) rotate(${drag.startRot})`);
    } else if (drag.mode === 'rotate') {
      const a = Math.atan2(c.y - drag.el.y, c.x - drag.el.x) * 180 / Math.PI + 90;
      drag.el.rotation = Math.round(a);
      g.setAttribute('transform', `translate(${drag.el.x},${drag.el.y}) rotate(${drag.el.rotation})`);
    }
    evt.preventDefault();
  };

  const onUp = (evt) => {
    if (drag && drag.mode && drag.el) {
      onCommit(drag.selId, { x: drag.el.x, y: drag.el.y, scale: drag.el.scale, rotation: drag.el.rotation });
    }
    drag = drag && drag.mode === null ? drag : null;
    try { svg.releasePointerCapture(evt.pointerId); } catch (e) { /* no capture */ }
  };

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  return () => {
    svg.removeEventListener('pointerdown', onDown);
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onUp);
  };
}
