// rules.js — pure functions only (no DOM, no storage). The ten "Rules that must
// hold" from PRD.md section 6, the pricing engine, the print-area clamp, and the
// local design generator. test.mjs imports this file.
import { PRODUCTS, COLOURS, TIERS, productById, techniqueById, colourById } from './data.js';

// ---------------------------------------------------------------- ids / money
export const uid = (p = 'e') => p + '-' + Math.random().toString(36).slice(2, 8);

export function money(paise) {
  const neg = paise < 0;
  const rupees = Math.floor(Math.abs(paise) / 100);
  let s = String(rupees);
  if (s.length > 3) {
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    s = rest + ',' + last3;
  }
  return `${neg ? '-' : ''}₹${s}`;
}
export const rupeesToPaise = (v) => Math.round(Number(String(v).replace(/[^0-9.]/g, '')) * 100 || 0);
export const paiseToRupees = (p) => p / 100;

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${mo[m - 1]} ${String(y).slice(2)}`;
}

// ---------------------------------------------------------------- pricing (PRD rule 3)
export function tierFor(qty) {
  return TIERS.find((t) => qty >= t.min) || TIERS[TIERS.length - 1];
}

/** locations = how many print locations (front/back) carry artwork; at least 1. */
export function priceOf({ productId, technique, qty, locations }) {
  const product = productById(productId);
  const tech = techniqueById(technique);
  const q = Math.max(1, Number(qty) || 1);
  const loc = Math.max(1, Number(locations) || 1);
  const base = product.basePrice;
  const surcharge = tech.surcharge * loc;
  const unitBefore = base + surcharge;
  const tier = tierFor(q);
  const unit = Math.round((unitBefore * tier.factor) / 100) * 100; // whole-rupee prices
  return {
    base, surcharge, unitBefore, unit, qty: q, locations: loc,
    total: unit * q,
    discountPct: Math.round((1 - tier.factor) * 100),
    tierLabel: tier.label,
    techName: tech.name,
    minQtyWarning: q < tech.minQty ? `${tech.name} is best from ${tech.minQty} pieces.` : null,
  };
}

// ---------------------------------------------------------------- design helpers
export function viewElements(design, view) {
  return (design && design.views && design.views[view] && design.views[view].elements) || [];
}
export function allElements(design) {
  return [...viewElements(design, 'front'), ...viewElements(design, 'back')];
}
export function hasArtwork(design) {
  return allElements(design).length > 0;
}
export function locations(design) {
  return ['front', 'back'].filter((v) => viewElements(design, v).length > 0).length || 0;
}

export function elementSize(el) {
  const scale = Number(el.scale) || 1;
  if (el.type === 'image' || el.type === 'shape') {
    return { w: (Number(el.w) || 100) * scale, h: (Number(el.h) || 100) * scale };
  }
  const size = Number(el.size) || 40;
  const lines = String(el.text || '').split('\n');
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 1);
  return { w: Math.max(24, longest * size * 0.62) * scale, h: lines.length * size * 1.18 * scale };
}

/** Clamp an element's centre so its (unrotated) bounds stay inside the print area.
 *  Rotation is intentionally ignored in the clamp; the canvas shows the guide. */
export function clampElement(el, printArea) {
  const { w, h } = elementSize(el);
  const halfW = Math.min(w, printArea.w) / 2;
  const halfH = Math.min(h, printArea.h) / 2;
  let x = Number(el.x), y = Number(el.y);
  if (!isFinite(x)) x = printArea.x + printArea.w / 2;
  if (!isFinite(y)) y = printArea.y + printArea.h / 2;
  x = Math.min(printArea.x + printArea.w - halfW, Math.max(printArea.x + halfW, x));
  y = Math.min(printArea.y + printArea.h - halfH, Math.max(printArea.y + halfH, y));
  return { x, y };
}

export function insidePrintArea(el, printArea) {
  const { w, h } = elementSize(el);
  const eps = 0.6;
  return el.x - w / 2 >= printArea.x - eps && el.x + w / 2 <= printArea.x + printArea.w + eps
    && el.y - h / 2 >= printArea.y - eps && el.y + h / 2 <= printArea.y + printArea.h + eps;
}

export function printAreaFor(productId, view) {
  const p = productById(productId);
  return p.views[view].printArea;
}

// ---------------------------------------------------------------- contrast (PRD rule 2 / F3)
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/** returns a warning string when text nearly matches the garment colour */
export function contrastWarning(textHex, garmentHex) {
  const ratio = contrastRatio(textHex, garmentHex);
  if (ratio >= 3) return null;
  return `Low contrast (${ratio.toFixed(1)}:1) — this text may not read on this colour.`;
}

// ---------------------------------------------------------------- validation (gates)
export function validateEnquiry(lead) {
  const errors = [];
  if (!String(lead.name || '').trim() && !String(lead.company || '').trim()) errors.push('A name or company is required.');
  if (!String(lead.phone || '').trim() && !String(lead.email || '').trim()) errors.push('A phone number or email is required.');
  if (!(Number(lead.qty) > 0)) errors.push('Quantity must be greater than zero.');
  return { ok: errors.length === 0, errors };
}

/** PRD rule 4: an order always carries its design; no artwork, no order. */
export function validateOrder(order) {
  if (!order) return { ok: false, errors: ['No order.'] };
  if (!hasArtwork(order.design)) return { ok: false, errors: ['This order has no artwork. Add text or an image before confirming.'] };
  if (!(Number(order.qty) > 0)) return { ok: false, errors: ['Quantity must be greater than zero.'] };
  return { ok: true, errors: [] };
}

// ---------------------------------------------------------------- refs / audit
export function nextOrderRef(orders) {
  const n = orders.length + 1;
  return 'GS-' + String(2600 + n).slice(-4);
}
export function makeAuditEntry(actor, role, entity, entityRef, action, at = new Date().toISOString()) {
  return { id: uid('AU'), at, actor, role, entity, entityRef, action };
}
export function appendAudit(list, entry) { return [...list, entry]; }

// ---------------------------------------------------------------- CRM
export function pipelineStats(leads) {
  const by = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 };
  leads.forEach((l) => { by[l.stage] = (by[l.stage] || 0) + 1; });
  const openValue = leads.filter((l) => ['new', 'contacted', 'quoted'].includes(l.stage))
    .reduce((t, l) => t + (Number(l.qty) || 0), 0);
  return { by, total: leads.length, openUnits: openValue };
}
export function dueFollowUps(leads, today) {
  return leads.filter((l) => l.followUp && !['won', 'lost'].includes(l.stage) && l.followUp <= today);
}

// ---------------------------------------------------------------- local design generator (F9)
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PALETTES = {
  sunset: ['#E4661E', '#F2A03D', '#0E6E6E', '#F6F1E7'],
  retro: ['#E4661E', '#C24E10', '#1B2A5B', '#F2C6D3'],
  mountain: ['#1B2A5B', '#0E6E6E', '#A9CBE8', '#F6F1E7'],
  ocean: ['#0E6E6E', '#A9CBE8', '#1B2A5B', '#FFFFFF'],
  forest: ['#55603A', '#0E6E6E', '#F1EDE2', '#1B2A5B'],
  tech: ['#1B2A5B', '#2A4FA8', '#0E6E6E', '#FFFFFF'],
  fest: ['#E4661E', '#2A4FA8', '#F2C6D3', '#F6F1E7'],
  minimal: ['#14161A', '#FFFFFF', '#B7BCC2', '#E4661E'],
};
function pickPalette(q) {
  const s = q.toLowerCase();
  for (const key of Object.keys(PALETTES)) if (s.includes(key)) return { key, colours: PALETTES[key] };
  if (/diwali|fest|celebrat|party|event|marathon/.test(s)) return { key: 'fest', colours: PALETTES.fest };
  if (/mountain|himalaya|trek|adventure|travel/.test(s)) return { key: 'mountain', colours: PALETTES.mountain };
  if (/tech|code|soft|app|startup|ai/.test(s)) return { key: 'tech', colours: PALETTES.tech };
  return { key: 'retro', colours: PALETTES.retro };
}

/** Deterministic: the same prompt always yields the same design. Every element is clamped. */
export function generateDesign(prompt, productId, view = 'front') {
  const text = String(prompt || '').trim();
  const seed = hashStr(text || 'ginger');
  const r = rng(seed);
  const { colours } = pickPalette(text);
  const pa = printAreaFor(productId, view);
  const words = text.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const headline = (words.slice(0, 2).join(' ') || 'YOUR DESIGN').toUpperCase().slice(0, 14);
  const sub = (words.slice(2, 6).join(' ') || 'MADE IN JAIPUR').toUpperCase().slice(0, 24);
  // size text so its (unrotated) width fits the print area
  const fit = (str, target) => {
    const longest = Math.max(1, ...str.split('\n').map((l) => l.length));
    return Math.max(11, Math.min(target, Math.floor(pa.w / (longest * 0.62))));
  };

  const els = [];
  const gid = (i) => `gen-${seed}-${i}`;
  // decorative shape behind the text
  const shapes = ['circle', 'rect', 'rays', 'banner'];
  const shape = shapes[Math.floor(r() * shapes.length)];
  els.push({
    id: gid(0), type: 'shape', shape,
    colour: colours[Math.floor(r() * colours.length)],
    w: Math.round(pa.w * 0.9), h: Math.round(pa.h * 0.42),
    x: pa.x + pa.w / 2, y: pa.y + pa.h * (0.34 + r() * 0.1), scale: 1, rotation: 0,
  });
  els.push({
    id: gid(1), type: 'text', text: headline,
    font: ['Impact', 'Arial Black', 'Verdana'][Math.floor(r() * 3)],
    colour: colours[Math.floor(r() * colours.length)],
    size: fit(headline, 46), x: pa.x + pa.w / 2, y: pa.y + pa.h * (0.42 + r() * 0.08), scale: 1, rotation: 0,
  });
  els.push({
    id: gid(2), type: 'text', text: sub,
    font: 'Trebuchet MS', colour: colours[Math.floor(r() * colours.length)],
    size: fit(sub, 20), x: pa.x + pa.w / 2, y: pa.y + pa.h * 0.64, scale: 1, rotation: 0,
  });
  return els.map((e) => ({ ...e, ...clampElement(e, pa) }));
}

export { PRODUCTS, COLOURS, TIERS, productById, techniqueById, colourById };
