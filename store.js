// store.js — persistence + audited mutations. The only module that writes.
import { seed, productById, techniqueById, colourById } from './data.js';
import * as R from './rules.js';

const KEY = 'gingerstudio.v1';
let state = null;
const subs = [];

export function getState() { return state; }
export function getUser() { return state.users.find((u) => u.id === state.currentUserId) || state.users[0]; }
export function subscribe(fn) { subs.push(fn); }
function emit() { subs.forEach((fn) => fn()); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* blocked */ } }

function fresh() { const s = seed(); s.flash = null; return s; }

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
  state = raw ? JSON.parse(raw) : fresh();
  if (!state.currentDraft || !state.users) state = fresh();
  if (!state.cart) state.cart = [];
  if (!state.currentDraft.mode) state.currentDraft.mode = 'personal';
  if (!state.currentDraft.sizeBreakdown) state.currentDraft.sizeBreakdown = { S: 0, M: 1, L: 0, XL: 0, XXL: 0 };
  save();
}

export function setUser(id) { state.currentUserId = id; save(); emit(); }
export function flash(type, msg) { state.flash = { type, msg }; emit(); }
export function clearFlash() { state.flash = null; }

function audited(entity, entityRef, action, fn) {
  const res = fn();
  if (res && res.ok === false) return res;
  const u = getUser();
  state.audit = R.appendAudit(state.audit, R.makeAuditEntry(u.id, u.role, entity, entityRef, action));
  save(); emit();
  return res || { ok: true };
}

// ------------------------------------------------------------------ draft
const draft = () => state.currentDraft;
const area = () => R.printAreaFor(draft().productId, draft().activeView);

export function setDraft(patch) {
  Object.assign(draft(), patch);
  // a garment/product change must never touch the element arrays (PRD rule 1)
  if (patch.productId) {
    ['front', 'back'].forEach((v) => {
      const pa = R.printAreaFor(patch.productId, v);
      draft().views[v].elements = draft().views[v].elements.map((e) => ({ ...e, ...R.clampElement(e, pa) }));
    });
  }
  save(); emit();
}

export function setMode(mode) {
  draft().mode = mode;
  if (mode === 'personal' && totalQty() !== 1) draft().sizeBreakdown = { S: 0, M: 1, L: 0, XL: 0, XXL: 0 };
  save(); emit();
}
export function setQty(q) {
  const n = Math.max(1, Number(q) || 1);
  draft().qty = n;
  const sizes = productById(draft().productId).sizes;
  const sb = {}; sizes.forEach((s) => { sb[s] = 0; }); sb[sizes[0]] = n;
  draft().sizeBreakdown = sb;
  save(); emit();
}
export function setSizeQty(size, q) {
  draft().sizeBreakdown[size] = Math.max(0, Number(q) || 0);
  draft().qty = totalQty();
  save(); emit();
}
export function totalQty() {
  return Object.values(draft().sizeBreakdown || {}).reduce((t, n) => t + (Number(n) || 0), 0) || 1;
}
export function currentLocations() { return R.locations(draft()); }

export function addElement(el) {
  const pa = area();
  const placed = { ...el, ...R.clampElement(el, pa) };
  draft().views[draft().activeView].elements.push(placed);
  return audited('design', 'draft', 'element added', () => ({ ok: true }));
}
export function updateElement(view, id, patch) {
  const els = draft().views[view].elements;
  const i = els.findIndex((e) => e.id === id);
  if (i < 0) return { ok: false, errors: ['Element not found.'] };
  const next = { ...els[i], ...patch };
  const pa = R.printAreaFor(draft().productId, view);
  els[i] = { ...next, ...R.clampElement(next, pa) };
  save(); emit();
  return { ok: true };
}
export function removeElement(view, id) {
  draft().views[view].elements = draft().views[view].elements.filter((e) => e.id !== id);
  return audited('design', 'draft', 'element removed', () => ({ ok: true }));
}
export function duplicateElement(view, id) {
  const el = draft().views[view].elements.find((e) => e.id === id);
  if (!el) return { ok: false, errors: ['Element not found.'] };
  const copy = { ...el, id: R.uid(), x: el.x + 14, y: el.y + 14 };
  draft().views[view].elements.push({ ...copy, ...R.clampElement(copy, R.printAreaFor(draft().productId, view)) });
  return audited('design', 'draft', 'element duplicated', () => ({ ok: true }));
}
export function bringToFront(view, id) {
  const els = draft().views[view].elements;
  const i = els.findIndex((e) => e.id === id);
  if (i < 0) return { ok: false, errors: ['Element not found.'] };
  const [el] = els.splice(i, 1); els.push(el);
  save(); emit();
  return { ok: true };
}
export function clearView(view) {
  draft().views[view].elements = [];
  return audited('design', 'draft', 'view cleared', () => ({ ok: true }));
}

// ------------------------------------------------------------------ saved designs
export function saveDesign(name) {
  if (!R.hasArtwork(draft())) return { ok: false, errors: ['Add some artwork before saving.'] };
  return audited('design', name || 'untitled', 'saved', () => {
    state.savedDesigns.unshift({
      id: R.uid('SD'), name: name || 'Untitled design', createdAt: R.formatDate ? new Date().toISOString().slice(0, 10) : '',
      productId: draft().productId, colourId: draft().colourId, technique: draft().technique,
      design: JSON.parse(JSON.stringify({ views: draft().views })),
    });
    return { ok: true };
  });
}
export function loadDesign(id) {
  const sd = state.savedDesigns.find((d) => d.id === id);
  if (!sd) return { ok: false, errors: ['Design not found.'] };
  return audited('design', sd.name, 'reopened', () => {
    draft().productId = sd.productId;
    draft().colourId = sd.colourId;
    draft().technique = sd.technique;
    draft().activeView = 'front';
    draft().views = JSON.parse(JSON.stringify(sd.design.views));
    // re-clamp to the current print areas
    ['front', 'back'].forEach((v) => {
      const pa = R.printAreaFor(draft().productId, v);
      draft().views[v].elements = draft().views[v].elements.map((e) => ({ ...e, ...R.clampElement(e, pa) }));
    });
    return { ok: true };
  });
}
export function deleteDesign(id) {
  state.savedDesigns = state.savedDesigns.filter((d) => d.id !== id);
  return audited('design', id, 'deleted', () => ({ ok: true }));
}

// ------------------------------------------------------------------ cart + orders
export function draftLine() {
  const d = draft();
  const qty = d.mode === 'bulk' ? totalQty() : Math.max(1, totalQty());
  const price = R.priceOf({ productId: d.productId, technique: d.technique, qty, locations: R.locations(d) });
  return {
    id: R.uid('LI'), productId: d.productId, colourId: d.colourId, technique: d.technique,
    qty, sizeBreakdown: { ...d.sizeBreakdown }, unitPrice: price.unit, total: price.total, mode: d.mode,
    design: JSON.parse(JSON.stringify({ views: d.views })),
  };
}
export function addToCart() {
  const line = draftLine();
  if (!R.hasArtwork(line.design)) return { ok: false, errors: ['Add text or an image before adding to the cart.'] };
  state.cart.push(line);
  return audited('cart', line.id, 'design added', () => ({ ok: true }));
}
export function removeFromCart(id) {
  state.cart = state.cart.filter((l) => l.id !== id);
  save(); emit();
  return { ok: true };
}
export function clearCart() { state.cart = []; save(); emit(); }

export function placeOrder(customer, itemIds) {
  const items = state.cart.filter((l) => !itemIds || itemIds.includes(l.id));
  const list = items.length ? items : [draftLine()];
  const errors = [];
  list.forEach((l, i) => { const v = R.validateOrder(l); if (!v.ok) errors.push(`Item ${i + 1}: ${v.errors[0]}`); });
  if (!String(customer.name || '').trim()) errors.push('A name is required.');
  if (!String(customer.phone || '').trim() && !String(customer.email || '').trim()) errors.push('A phone or email is required.');
  if (errors.length) return { ok: false, errors };
  return audited('order', customer.name, 'placed', () => {
    const refs = [];
    list.forEach((l) => {
      const ref = R.nextOrderRef(state.orders);
      state.orders.unshift({
        id: R.uid('O'), ref, customer: { ...customer }, productId: l.productId, colourId: l.colourId,
        technique: l.technique, qty: l.qty, sizeBreakdown: { ...l.sizeBreakdown }, unitPrice: l.unitPrice,
        total: l.total, status: 'new', createdAt: new Date().toISOString().slice(0, 10), mode: l.mode,
        design: JSON.parse(JSON.stringify(l.design)),
      });
      refs.push(ref);
      state.loyalty.points += Math.floor((l.total / 100) / state.settings.loyaltyPerRupee);
      state.loyalty.lifetimeOrders += 1;
    });
    state.cart = [];
    return { ok: true, refs };
  });
}
export function setOrderStatus(orderId, status) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, errors: ['Order not found.'] };
  return audited('order', o.ref, `status → ${status}`, () => { o.status = status; return { ok: true }; });
}
export function reorder(orderId) {
  const o = state.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, errors: ['Order not found.'] };
  return audited('order', o.ref, 'reordered', () => {
    draft().productId = o.productId; draft().colourId = o.colourId; draft().technique = o.technique;
    draft().mode = o.mode || 'personal'; draft().activeView = 'front';
    draft().views = JSON.parse(JSON.stringify(o.design.views));
    draft().sizeBreakdown = { ...o.sizeBreakdown }; draft().qty = o.qty;
    return { ok: true };
  });
}

// ------------------------------------------------------------------ leads / CRM
export function addLead(lead) {
  const v = R.validateEnquiry(lead);
  if (!v.ok) return { ok: false, errors: v.errors };
  return audited('lead', lead.name || lead.company, 'captured', () => {
    state.leads.unshift({
      id: R.uid('L'), name: lead.name || '', company: lead.company || '', phone: lead.phone || '',
      email: lead.email || '', productId: lead.productId || 'crew', qty: Number(lead.qty) || 0,
      note: lead.note || '', source: lead.source || 'Website enquiry', stage: 'new',
      followUp: lead.followUp || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10), notes: [],
    });
    return { ok: true };
  });
}
export function setLeadStage(id, stage) {
  const l = state.leads.find((x) => x.id === id);
  if (!l) return { ok: false, errors: ['Lead not found.'] };
  return audited('lead', l.name || l.company, `stage → ${stage}`, () => { l.stage = stage; return { ok: true }; });
}
export function setLeadFollowUp(id, date) {
  const l = state.leads.find((x) => x.id === id);
  if (!l) return { ok: false, errors: ['Lead not found.'] };
  return audited('lead', l.name || l.company, 'follow-up set', () => { l.followUp = date; return { ok: true }; });
}
export function addLeadNote(id, text) {
  if (!String(text || '').trim()) return { ok: false, errors: ['Note is empty.'] };
  const l = state.leads.find((x) => x.id === id);
  if (!l) return { ok: false, errors: ['Lead not found.'] };
  return audited('lead', l.name || l.company, 'note added', () => { l.notes.push({ at: new Date().toISOString().slice(0, 10), text }); return { ok: true }; });
}
export function convertLeadToOrder(id) {
  const l = state.leads.find((x) => x.id === id);
  if (!l) return { ok: false, errors: ['Lead not found.'] };
  return audited('lead', l.name || l.company, 'converted to order', () => {
    const ref = R.nextOrderRef(state.orders);
    state.orders.unshift({
      id: R.uid('O'), ref, customer: { name: l.name || l.company, phone: l.phone, email: l.email },
      productId: l.productId, colourId: 'navy', technique: 'dtf', qty: l.qty,
      sizeBreakdown: { M: l.qty }, unitPrice: R.priceOf({ productId: l.productId, technique: 'dtf', qty: l.qty, locations: 1 }).unit,
      total: R.priceOf({ productId: l.productId, technique: 'dtf', qty: l.qty, locations: 1 }).total,
      status: 'new', createdAt: new Date().toISOString().slice(0, 10), mode: 'bulk',
      design: { views: { front: { elements: [] }, back: { elements: [] } } }, fromLead: l.id, needsArtwork: true,
    });
    l.stage = 'won';
    return { ok: true, ref };
  });
}

// ------------------------------------------------------------------ utility
export function exportJSON() { const c = { ...state }; delete c.flash; return JSON.stringify(c, null, 2); }
export function importJSON(text) {
  try {
    const p = JSON.parse(text);
    if (!p.users || !p.orders) return { ok: false, errors: ['That does not look like a Ginger Studio export.'] };
    p.flash = null; state = p; save(); emit();
    return { ok: true, errors: [] };
  } catch (e) { return { ok: false, errors: ['Could not read that JSON.'] }; }
}
export function reset() { state = fresh(); save(); emit(); }
