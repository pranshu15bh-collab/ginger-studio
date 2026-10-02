// views.js — rendering + handlers. Reads state; writes only via store.js.
import * as R from './rules.js';
import * as S from './store.js';
import * as AI from './ai.js';
import { studioSVG, fullSVG, artworkSVG, mountStudio, refreshElement } from './studio.js';
import { PRODUCTS, COLOURS, TECHNIQUES, FONTS, productById, colourById, techniqueById } from './data.js';

export const ui = { selectedId: null, listening: false, notice: null, enquiryOpen: false, openLead: null };
let rerender = () => {};
export function setRerender(fn) { rerender = fn; }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_LABEL = { new: 'New', in_production: 'In production', printed: 'Printed', shipped: 'Shipped' };
const STAGE_LABEL = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
const STAGE_TONE = { new: 'info', contacted: 'warn', quoted: 'warn', won: 'ok', lost: 'danger' };

const chip = (t, tone) => `<span class="chip chip--${tone || 'muted'}">${esc(t)}</span>`;
const money = (p) => R.money(p);
const thumb = (productId, colourId, view = 'front') => `<span class="thumb">${fullSVG({ views: { front: { elements: [] }, back: { elements: [] } } }, productId, colourId, view)}</span>`;

const NAV = [
  ['#/', 'Home'], ['#/shop', 'Shop'], ['#/studio', 'Design studio'], ['#/cart', 'Cart'],
  ['#/orders', 'My orders'], ['#/saved', 'Saved designs'], ['#/admin', 'Production'],
  ['#/leads', 'Leads & CRM'], ['#/about', 'About'],
];

const icons = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
  shop: '<path d="M6 7h12l1 12H5z"/><path d="M9 7a3 3 0 016 0"/>',
  studio: '<path d="M4 20l6-6"/><path d="M13 4l7 7-8 8H5v-7z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.4 11h11l2-8H6"/>',
  orders: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  saved: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  admin: '<path d="M12 3v18M5 8l7-5 7 5"/><rect x="5" y="8" width="14" height="12" rx="1"/>',
  leads: '<path d="M4 20V6l8-3 8 3v14"/><path d="M9 20v-6h6v6"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8h.01"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
};
const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${icons[k] || ''}</svg>`;

function layout(state, active, content) {
  const cartCount = state.cart.length;
  const facts = state.currentDraft && state.currentDraft.views ? R.allElements(state.currentDraft).length : 0;
  const nav = NAV.map(([href, label]) => {
    const key = href === '#/' ? 'home' : href.replace('#/', '');
    return `<a class="nav__item ${active === href ? 'is-active' : ''}" href="${href}">${icon(key)}<span>${esc(label)}</span>${label === 'Cart' && cartCount ? `<b class="nav__badge">${cartCount}</b>` : ''}${label === 'Design studio' && facts ? `<b class="nav__badge nav__badge--dot" title="${facts} element(s) in progress"></b>` : ''}</a>`;
  }).join('');
  const u = S.getUser();
  const roles = state.users.map((x) => `<option value="${x.id}" ${x.id === u.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const flash = state.flash ? `<div class="flash flash--${state.flash.type}">${esc(state.flash.msg)}</div>` : '';
  return `<div class="shell">
    <aside class="side">
      <a class="brand" href="#/"><span class="brand__mark">GS</span><span class="brand__name">Ginger Studio<small>Sweet Ginger Fashions</small></span></a>
      <nav class="nav">${nav}</nav>
      <div class="side__foot">
        <p class="side__note">Working MVP · sample rates. Made in Jaipur.</p>
        <a class="side__link" href="#/about">How this was built</a>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="top__menu" data-action="toggleMenu" aria-label="Open menu" type="button">☰</button>
        <a class="top__brand" href="#/">GS</a>
        <a class="top__cart" href="#/cart">${icon('cart')}<span>Cart</span>${cartCount ? `<b>${cartCount}</b>` : ''}</a>
        <label class="top__role"><span>Signed in as</span><select data-change="role">${roles}</select></label>
      </header>
      ${flash}
      <main class="content">${content}</main>
      <footer class="foot"><span>Ginger Studio — Sweet Ginger Fashions, Jaipur</span><span>Runs on your device · no account needed to design</span></footer>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ home
function home(state) {
  const feat = ['crew', 'oversized', 'polo', 'hoodie'].map((id) => {
    const p = productById(id);
    return `<a class="card product" href="#/product/${p.id}"><div class="product__art">${thumb(p.id, p.colours[0])}</div>
      <div class="product__meta"><b>${esc(p.name)}</b><span class="muted">from ${money(p.basePrice)}</span></div></a>`;
  }).join('');
  return `<div class="site">
    <section class="hero">
      <p class="eyebrow">Sweet Ginger Fashions · Jaipur · 17+ years</p>
      <h1>Design it. See it on the shirt. Order it.</h1>
      <p class="lede">Pick a blank, add your words or your logo, place it on the shirt and watch the price. One tee or five hundred — same studio. No more back-and-forth.</p>
      <div class="hero__cta"><a class="btn btn--primary btn--lg" href="#/studio">Start designing</a><a class="btn btn--ghost btn--lg" href="#/shop">Shop blanks</a></div>
      <p class="hero__note">17+ years · three verticals · printed, embroidered and vinyl in-house</p>
    </section>
    <section class="band">
      <div class="band__head"><h2>Three ways in</h2><p>Whatever you came for, it starts here.</p></div>
      <div class="grid grid--3">
        <a class="card way" href="#/studio"><span class="way__n">01</span><h3>Design one tee</h3><p>Add text or a logo, move it, pick a colour. Order in a few minutes.</p></a>
        <a class="card way" href="#/studio?mode=bulk"><span class="way__n">02</span><h3>Bulk for your team</h3><p>Set a quantity per size, get a bulk price, order in one go.</p></a>
        <a class="card way" href="#/leads"><span class="way__n">03</span><h3>Not sure yet?</h3><p>Send a bulk enquiry — a real person replies with a quote.</p></a>
      </div>
    </section>
    <section class="band">
      <div class="band__head"><h2>Start from a blank</h2><p>T-shirts first, then hoodies and caps.</p></div>
      <div class="grid grid--4">${feat}</div>
      <div class="center"><a class="btn btn--primary" href="#/shop">See all products</a></div>
    </section>
    <section class="band band--ink">
      <div class="band__head"><h2>Why order from Ginger Studio</h2></div>
      <div class="grid grid--3">
        <div class="promise"><h3>You see it before we print it</h3><p>Your design on the real shirt colour, so there are no surprises.</p></div>
        <div class="promise"><h3>Made in-house</h3><p>We manufacture the blanks and print them — DTF, embroidery and vinyl under one roof.</p></div>
        <div class="promise"><h3>One studio, one tee or 500</h3><p>Bulk pricing with a per-size grid, and the same canvas for a single order.</p></div>
      </div>
    </section>
    <section class="band">
      <div class="band__head"><h2>Trusted for events and teams</h2></div>
      <div class="grid grid--3">
        <blockquote class="quote">"College fest, 400 tees, five sizes, one week. The per-size grid made it painless."<footer>— Fest organiser, Jaipur</footer></blockquote>
        <blockquote class="quote">"Sent our logo, saw it on the polo before paying. No WhatsApp back-and-forth."<footer>— Ops lead, events company</footer></blockquote>
        <blockquote class="quote">"Same studio for our staff hoodies and the retail drop."<footer>— Store manager</footer></blockquote>
      </div>
      <div class="center"><a class="btn btn--primary btn--lg" href="#/studio">Design your first one</a></div>
    </section>
  </div>`;
}

// ------------------------------------------------------------------ shop + product
function shop() {
  const cards = PRODUCTS.map((p) => `<a class="card product" href="#/product/${p.id}">
    <div class="product__art">${thumb(p.id, p.colours[0])}</div>
    <div class="product__meta"><b>${esc(p.name)}</b><span class="muted">${esc(p.category)} · from ${money(p.basePrice)}</span></div>
    <div class="product__sw">${p.colours.slice(0, 6).map((c) => `<i style="background:${colourById(c).hex}" title="${esc(colourById(c).name)}"></i>`).join('')}</div></a>`).join('');
  return `<div class="pagehead"><div><p class="eyebrow">Shop</p><h1>Blanks, ready to print</h1><p class="lede">Pick a product to start designing. All prices are sample rates.</p></div></div>
    <div class="grid grid--4">${cards}</div>`;
}

function productPage(id) {
  const p = productById(id);
  const d = S.getState().currentDraft;
  const chosen = p.colours.includes(d.colourId) ? d.colourId : p.colours[0];
  const price = R.priceOf({ productId: p.id, technique: 'dtf', qty: 1, locations: 1 });
  return `<div class="pagehead"><div><p class="eyebrow">${esc(p.category)}</p><h1>${esc(p.name)}</h1><p class="lede">${esc(p.blurb)}</p></div></div>
  <div class="grid grid--2">
    <div class="card pad">${thumb(p.id, chosen)}</div>
    <div class="card pad stack">
      <div><span class="label">Colour</span><div class="swatches">${p.colours.map((c) => `<button class="swatch ${c === chosen ? 'is-active' : ''}" data-action="pickColour" data-colour="${c}" data-product="${p.id}" title="${esc(colourById(c).name)}" style="background:${colourById(c).hex}"></button>`).join('')}</div><p class="small muted">${esc(colourById(chosen).name)}</p></div>
      <div><span class="label">Sizes</span><div class="chips">${p.sizes.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>
      <div><span class="label">Print method</span><div class="chips">${TECHNIQUES.map((t) => `<button class="chip chip--tap ${t.id === d.technique ? 'is-on' : ''}" data-action="pickTechnique" data-tech="${t.id}" data-product="${p.id}">${esc(t.name)}</button>`).join('')}</div></div>
      <div class="pricebox"><span>from</span><b>${money(price.unit)}</b><span class="muted">per piece, single</span></div>
      <button class="btn btn--primary btn--lg" data-action="startDesign" data-product="${p.id}" data-colour="${chosen}">Design this ${esc(p.id === 'cap' ? 'cap' : 'product')} →</button>
      <p class="hint">Your design is never lost when you change colour, size or quantity.</p>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ studio
function studio(state) {
  const d = state.currentDraft;
  const p = productById(d.productId);
  const tech = techniqueById(d.technique);
  const qty = d.mode === 'bulk' ? S.totalQty() : Math.max(1, S.totalQty());
  const locs = R.locations(d);
  const price = R.priceOf({ productId: d.productId, technique: d.technique, qty, locations: locs });
  const sel = R.viewElements(d, d.activeView).find((e) => e.id === ui.selectedId);
  const els = R.viewElements(d, d.activeView);

  const swatches = p.colours.map((c) => `<button class="swatch ${c === d.colourId ? 'is-active' : ''}" data-change="pickColourInline" data-colour="${c}" title="${esc(colourById(c).name)}" style="background:${colourById(c).hex}"></button>`).join('');
  const techChips = TECHNIQUES.map((t) => `<button class="chip chip--tap ${t.id === d.technique ? 'is-on' : ''}" data-change="pickTechniqueInline" data-tech="${t.id}">${esc(t.name)}</button>`).join('');

  const inspector = sel ? `
    <div class="inspector">
      <div class="inspector__head"><b>${esc(sel.type)} selected</b><div class="row"><button class="btn btn--tiny" data-action="bringFront" data-id="${sel.id}">Bring to front</button><button class="btn btn--tiny" data-action="duplicateEl" data-id="${sel.id}">Duplicate</button><button class="btn btn--tiny btn--danger" data-action="deleteEl" data-id="${sel.id}">Delete</button></div></div>
      ${sel.type === 'text' ? `
        <label class="field">Text<textarea data-change="editText" data-id="${sel.id}" rows="2">${esc(sel.text)}</textarea></label>
        <div class="form__row">
          <label class="field">Font<select data-change="editFont" data-id="${sel.id}">${FONTS.map((f) => `<option ${f === sel.font ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
          <label class="field">Text colour<input type="color" data-change="editColour" data-id="${sel.id}" value="${esc(sel.colour)}"></label>
        </div>
        <label class="field">Size <span class="muted" data-readout="size">${sel.size}px</span><input type="range" min="12" max="72" value="${sel.size}" data-live="liveElement" data-change="commitElement" data-id="${sel.id}" data-prop="size"></label>` : ''}
      <label class="field">Scale <span class="muted" data-readout="scale">${Math.round((sel.scale || 1) * 100)}%</span><input type="range" min="30" max="300" value="${Math.round((sel.scale || 1) * 100)}" data-live="liveElement" data-change="commitElement" data-id="${sel.id}" data-prop="scale"></label>
      <label class="field">Rotation <span class="muted" data-readout="rotation">${sel.rotation || 0}°</span><input type="range" min="-180" max="180" value="${sel.rotation || 0}" data-live="liveElement" data-change="commitElement" data-id="${sel.id}" data-prop="rotation"></label>
      ${sel.type === 'image' ? `<p class="hint">Tip: use “Remove background” once so the logo sits on the fabric.</p>` : ''}
    </div>` : `<p class="empty">Tap an element on the shirt to edit it, or add one below.</p>`;

  const sizeGrid = p.sizes.map((s) => `<div class="sizerow"><span>${esc(s)}</span><div class="stepper"><button data-action="stepSize" data-size="${s}" data-delta="-1">−</button><input type="number" min="0" value="${d.sizeBreakdown[s] || 0}" data-change="setSizeInput" data-size="${s}"><button data-action="stepSize" data-size="${s}" data-delta="1">+</button></div></div>`).join('');

  return `<div class="studio">
    <div class="studio__canvas card">
      <div class="studiotabs">
        <button class="chip chip--tap ${d.activeView === 'front' ? 'is-on' : ''}" data-change="setView" data-view="front">Front</button>
        <button class="chip chip--tap ${d.activeView === 'back' ? 'is-on' : ''}" data-change="setView" data-view="back">Back</button>
        <span class="muted small">${esc(p.name)} · ${esc(colourById(d.colourId).name)} · ${esc(tech.name)}</span>
      </div>
      <div class="stage" id="stage">${studioSVG(state, ui.selectedId)}</div>
      <div class="tools">
        <button class="btn" data-action="addText">＋ Text</button>
        <label class="btn filebtn">＋ Image<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-change="uploadArt" hidden></label>
        <button class="btn" data-action="toggleGen">✨ Generate</button>
        <button class="btn ${ui.listening ? 'btn--rec' : ''}" data-action="toggleVoice">${icon('mic')} ${ui.listening ? 'Listening…' : 'Speak'}</button>
        <button class="btn btn--ghost" data-action="clearView">Clear ${d.activeView}</button>
      </div>
      ${ui.notice ? `<div class="flash flash--warn">${esc(ui.notice)}</div>` : ''}
      <div class="genbox ${ui.showGen ? '' : 'is-hidden'}">
        <div class="ask">
          <input id="genPrompt" placeholder="Describe a design — or tap Speak and say it" data-live="genVoiceHint">
          <button class="btn" data-action="doGenerate">Generate design</button>
          <button class="btn btn--ghost" data-action="voiceToGen">${icon('mic')}</button>
        </div>
        <p class="hint">Runs on your device — a local generator, not an internet model. Everything it makes is editable.</p>
      </div>
    </div>

    <aside class="studio__side">
      <div class="card pad">
        <div class="row between"><b>${esc(p.name)}</b><span class="small muted">${els.length} element(s) on ${d.activeView}</span></div>
        <span class="label">Shirt colour</span>
        <div class="swatches">${swatches}</div>
        <span class="label">Print method</span>
        <div class="chips">${techChips}</div>
        <p class="hint">${esc(tech.note)}</p>
      </div>

      <div class="card pad">
        <div class="row between"><b>Mode</b></div>
        <div class="chips">
          <button class="chip chip--tap ${d.mode === 'personal' ? 'is-on' : ''}" data-change="setMode" data-mode="personal">Personal</button>
          <button class="chip chip--tap ${d.mode === 'bulk' ? 'is-on' : ''}" data-change="setMode" data-mode="bulk">Bulk / team</button>
        </div>
        ${d.mode === 'bulk' ? `<div class="sizegrid">${sizeGrid}</div>` : `<label class="field">Quantity<input type="number" min="1" value="${d.qty}" data-change="setQtyInput"></label>`}
      </div>

      <div class="card pad">
        <div class="pricebox pricebox--big">
          <div class="pbcol"><span class="muted small">${esc(price.tierLabel)} tier${price.discountPct ? ` · ${price.discountPct}% off` : ''}</span><b>${money(price.unit)}</b><span class="muted small">per piece${price.locations > 1 ? ` · ${price.locations} print areas` : ''}</span></div>
          <div class="pbcol pbcol--right"><span class="muted small">Total</span><b>${money(price.total)}</b><span class="muted small">${qty} pcs</span></div>
        </div>
        ${price.minQtyWarning ? `<p class="hint warn">${esc(price.minQtyWarning)}</p>` : ''}
        ${state.settings.sampleRates ? `<p class="hint">Sample rates — confirm with Shankar before quoting.</p>` : ''}
        <div class="row">
          <button class="btn" data-action="addCart">Add to cart</button>
          <button class="btn btn--primary" data-action="goCheckout">Confirm order →</button>
        </div>
      </div>

      <div class="card pad">${inspector}</div>

      <div class="card pad">
        <div class="row between"><b>Saved designs</b><button class="btn btn--tiny" data-action="saveDesignPrompt">Save current</button></div>
        ${state.savedDesigns.slice(0, 3).map((d2) => `<div class="row between savedrow"><a href="#" data-action="loadDesign" data-id="${d2.id}">${esc(d2.name)}</a><span class="small muted">${esc(productById(d2.productId).name)}</span></div>`).join('') || '<p class="empty">Nothing saved yet.</p>'}
      </div>
    </aside>
  </div>`;
}

// ------------------------------------------------------------------ cart + confirm
function cart(state) {
  const items = state.cart;
  const subtotal = items.reduce((t, l) => t + l.total, 0);
  const rows = items.map((l) => `<div class="lineitem">
    <div class="lineitem__art">${thumb(l.productId, l.colourId)}</div>
    <div class="lineitem__meta"><b>${esc(productById(l.productId).name)}</b><span class="muted small">${esc(colourById(l.colourId).name)} · ${esc(techniqueById(l.technique).name)} · ${l.qty} pc · ${esc(l.mode)}</span>
      <span class="small">${Object.entries(l.sizeBreakdown).filter(([, n]) => n).map(([s, n]) => `${s}:${n}`).join(' · ')}</span></div>
    <div class="lineitem__price">${money(l.total)}<div class="small muted">${money(l.unitPrice)}/pc</div></div>
    <button class="btn btn--tiny btn--danger" data-action="removeCart" data-id="${l.id}">Remove</button>
  </div>`).join('');
  return `<div class="pagehead"><div><p class="eyebrow">Cart</p><h1>Your order</h1><p class="lede">Confirm the order and we take it from here. This is an order request — no payment is taken online.</p></div></div>
  ${items.length ? `<div class="grid grid--2">
    <div class="card pad">${rows}<div class="row between totalrow"><span>Subtotal</span><b>${money(subtotal)}</b></div><p class="hint">GST and delivery are confirmed by the studio.</p></div>
    <div class="card pad">
      <b>Your details</b>
      <form class="form" data-form="confirmOrder">
        <div class="form__row"><label class="field">Name<input name="name" required></label><label class="field">Phone<input name="phone" placeholder="+91…"></label></div>
        <label class="field">Email<input name="email" type="email" placeholder="you@example.com"></label>
        <label class="field">Note (optional)<textarea name="note" rows="2"></textarea></label>
        <button class="btn btn--primary btn--lg" type="submit">Confirm order — ${money(subtotal)}</button>
        <p class="hint">An order with no artwork is refused. Every order keeps its design so it can be printed.</p>
      </form>
      <a class="btn btn--ghost" href="#/studio">← Back to the studio</a>
    </div>
  </div>` : `<div class="card pad empty">Your cart is empty. <a href="#/studio">Design something →</a></div>`}`;
}

function orderConfirmed(state, ref) {
  const o = state.orders.find((x) => x.ref === ref);
  const wa = `https://wa.me/${state.settings.whatsapp}?text=` + encodeURIComponent(`Hi, I placed order ${ref} on Ginger Studio. Design attached in my account.`);
  return `<div class="pagehead"><div><p class="eyebrow">Order received</p><h1>Thank you — order ${esc(ref)}</h1><p class="lede">Not paid: this is an order request. The studio confirms price, GST and delivery, then prints.</p></div></div>
  <div class="grid grid--2">
    <div class="card pad">${o ? `<div class="row"><div class="lineitem__art">${thumb(o.productId, o.colourId)}</div><div><b>${esc(productById(o.productId).name)}</b><p class="muted small">${esc(colourById(o.colourId).name)} · ${esc(techniqueById(o.technique).name)} · ${o.qty} pcs</p><p>${money(o.total)}</p></div></div>` : ''}</div>
    <div class="card pad stack">
      <p>Save this order to your account? It is already attached to your design, so you can reorder in one tap.</p>
      <a class="btn btn--primary" href="${wa}" target="_blank" rel="noopener">Send to the studio on WhatsApp</a>
      <a class="btn" href="#/orders">View my orders</a>
      <a class="btn btn--ghost" href="#/studio">Design another</a>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ orders / saved / admin
function orders(state) {
  const rows = state.orders.map((o) => `<div class="orderrow card pad">
    <div class="lineitem__art">${thumb(o.productId, o.colourId)}</div>
    <div class="lineitem__meta"><b>${esc(o.ref)}</b><span class="muted small">${esc(o.customer.name)} · ${esc(productById(o.productId).name)} · ${o.qty} pcs</span>${chip(STATUS_LABEL[o.status] || o.status, o.status === 'shipped' ? 'ok' : o.status === 'printed' ? 'info' : 'warn')}</div>
    <div class="lineitem__price">${money(o.total)}</div>
    <button class="btn btn--tiny" data-action="reorder" data-id="${o.id}">Reorder</button>
  </div>`).join('') || '<p class="empty">No orders yet.</p>';
  return `<div class="pagehead"><div><p class="eyebrow">My orders</p><h1>Your orders</h1><p class="lede">Every order keeps its design, so a reorder is one tap.</p></div></div>
  <div class="stack">${rows}</div>`;
}

function saved(state) {
  const rows = state.savedDesigns.map((d) => `<div class="orderrow card pad">
    <div class="lineitem__art">${fullSVG(d.design, d.productId, d.colourId, 'front')}</div>
    <div class="lineitem__meta"><b>${esc(d.name)}</b><span class="muted small">${esc(productById(d.productId).name)} · ${esc(colourById(d.colourId).name)} · saved ${esc(d.createdAt)}</span></div>
    <div class="row"><button class="btn btn--tiny" data-action="loadDesign" data-id="${d.id}">Open in studio</button><button class="btn btn--tiny btn--danger" data-action="deleteDesign" data-id="${d.id}">Delete</button></div>
  </div>`).join('') || '<p class="empty">No saved designs yet.</p>';
  return `<div class="pagehead"><div><p class="eyebrow">Saved designs</p><h1>Reuse your work</h1><p class="lede">Save a design once, reopen it any time, and keep reordering it.</p></div></div><div class="stack">${rows}</div>`;
}

function admin(state) {
  const rows = state.orders.map((o) => `<tr>
    <td><b>${esc(o.ref)}</b><div class="muted small">${esc(R.formatDate(o.createdAt))}</div></td>
    <td>${esc(o.customer.name)}</td>
    <td>${esc(productById(o.productId).name)}<div class="muted small">${esc(colourById(o.colourId).name)} · ${esc(techniqueById(o.technique).name)}</div></td>
    <td class="num">${o.qty}</td>
    <td>${chip(STATUS_LABEL[o.status] || o.status, o.status === 'shipped' ? 'ok' : o.status === 'printed' ? 'info' : 'warn')}</td>
    <td class="row">
      <button class="btn btn--tiny" data-action="exportArt" data-id="${o.id}">Artwork</button>
      <button class="btn btn--tiny" data-action="exportMock" data-id="${o.id}">Mockup</button>
      <select data-change="setStatus" data-id="${o.id}"><option value="">Status…</option><option value="in_production">In production</option><option value="printed">Printed</option><option value="shipped">Shipped</option></select>
    </td></tr>`).join('');
  return `<div class="pagehead"><div><p class="eyebrow">Production</p><h1>Orders &amp; artwork</h1><p class="lede">Download the print-ready artwork and move each order through production.</p></div></div>
  <div class="card">${state.orders.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Status</th><th>Artwork</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">No orders.</p>'}</div>
  <div class="card pad"><b>Recent activity</b><ul class="audit">${state.audit.slice().reverse().slice(0, 8).map((a) => `<li><b>${esc(a.action)}</b> · ${esc(a.entity)} ${esc(a.entityRef)} · ${esc(a.at.slice(0, 16).replace('T', ' '))}</li>`).join('')}</ul></div>`;
}

// ------------------------------------------------------------------ leads / CRM
function leads(state) {
  const stages = ['new', 'contacted', 'quoted', 'won', 'lost'];
  const stats = R.pipelineStats(state.leads);
  const cols = stages.map((st) => {
    const items = state.leads.filter((l) => l.stage === st).map((l) => `<button class="leadcard ${['won', 'lost'].includes(l.stage) ? 'is-closed' : ''}" data-action="openLead" data-id="${l.id}">
      <b>${esc(l.name || l.company)}</b><span class="muted small">${esc(productById(l.productId).name)} · ${l.qty} pcs</span>
      ${l.followUp && !['won', 'lost'].includes(l.stage) ? `<span class="small ${l.followUp <= '2026-10-02' ? 'warn' : 'muted'}">Follow up ${esc(R.formatDate(l.followUp))}</span>` : ''}</button>`).join('');
    return `<div class="leadcol"><div class="leadcol__head">${esc(STAGE_LABEL[st])} <b>${state.leads.filter((l) => l.stage === st).length}</b></div>${items || '<p class="empty small">—</p>'}</div>`;
  }).join('');
  const lead = state.leads.find((l) => l.id === ui.openLead);
  const detail = lead ? `<div class="card pad">
    <div class="row between"><b>${esc(lead.name || lead.company)}</b>${chip(STAGE_LABEL[lead.stage], STAGE_TONE[lead.stage])}</div>
    <p class="muted small">${esc(lead.phone)} ${lead.email ? '· ' + esc(lead.email) : ''} · ${esc(lead.source || '')}</p>
    <p>${esc(lead.note)}</p>
    <p class="small">${esc(productById(lead.productId).name)} · ${lead.qty} pcs · follow-up ${esc(R.formatDate(lead.followUp))}</p>
    <div class="chips">${stages.map((s2) => `<button class="chip chip--tap ${s2 === lead.stage ? 'is-on' : ''}" data-change="setLeadStage" data-id="${lead.id}" data-stage="${s2}">${esc(STAGE_LABEL[s2])}</button>`).join('')}</div>
    <form class="form form--inline" data-form="addLeadNote" data-id="${lead.id}"><label class="field">Add note<input name="text"></label><button class="btn btn--tiny" type="submit">Add</button></form>
    ${lead.notes.length ? `<ul class="audit">${lead.notes.map((n) => `<li>${esc(n.at)} — ${esc(n.text)}</li>`).join('')}</ul>` : ''}
    <label class="field">Follow-up date<input type="date" value="${esc(lead.followUp)}" data-change="setFollowUp" data-id="${lead.id}"></label>
    <button class="btn btn--primary" data-action="convertLead" data-id="${lead.id}">Convert to order</button>
  </div>` : `<div class="card pad"><p class="empty">Select a lead to see its detail.</p></div>`;
  const enquiry = ui.enquiryOpen ? `<div class="card pad">
    <b>Request a bulk quote</b>
    <form class="form" data-form="enquiry">
      <div class="form__row"><label class="field">Name<input name="name"></label><label class="field">Company<input name="company"></label></div>
      <div class="form__row"><label class="field">Phone<input name="phone" placeholder="+91…"></label><label class="field">Email<input name="email" type="email"></label></div>
      <div class="form__row"><label class="field">Product<select name="productId">${PRODUCTS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label class="field">Quantity<input name="qty" type="number" min="1" value="50"></label></div>
      <label class="field">What do you need? <button class="btn btn--tiny" type="button" data-action="voiceToEnquiry">${icon('mic')} Speak</button><textarea name="note" rows="2"></textarea></label>
      <button class="btn btn--primary" type="submit">Send enquiry</button>
    </form></div>` : '';
  return `<div class="pagehead"><div><p class="eyebrow">Leads &amp; CRM</p><h1>Enquiries pipeline</h1><p class="lede">Every bulk enquiry becomes a lead with a follow-up. Open units: ${stats.openUnits}.</p></div><button class="btn btn--primary" data-action="toggleEnquiry">New bulk enquiry</button></div>
  ${enquiry}
  <div class="leadboard">${cols}</div>
  ${detail}`;
}

function about() {
  return `<div class="pagehead"><div><p class="eyebrow">About</p><h1>How Ginger Studio was built</h1><p class="lede">From Shankar's brief to a PRD, a stack, a plan, a scope cut — then this. Names and prices come only from the brief; everything else is a labelled sample.</p></div></div>
  <div class="grid grid--2">
    <div class="card pad"><b>The pipeline</b><ol class="steps"><li><b>Brief.</b> The written discovery output.</li><li><b>PRD.</b> What he needs and what does not add up.</li><li><b>Stack.</b> Every choice traced to a constraint.</li><li><b>Plan.</b> Every step demonstrable.</li><li><b>Scope.</b> What ships now, what is Phase 2.</li><li><b>Brief.</b> Assembled, with past failures written back.</li></ol></div>
    <div class="card pad"><b>Rules enforced in code</b><ul class="ticks"><li>The design survives colour, size and quantity changes.</li><li>The preview uses the real garment colour.</li><li>A design cannot leave the print area.</li><li>An order always carries its design.</li><li>Price comes from product + method + quantity.</li></ul>
    <p class="hint">Voice, Generate and Remove background all run on your device. If a browser cannot do one, it says so.</p></div>
  </div>`;
}

// ------------------------------------------------------------------ router
export function render(state, route) {
  let active = route.hash, content;
  switch (route.name) {
    case 'home': content = home(state); break;
    case 'shop': content = shop(); break;
    case 'product': content = productPage(route.params[0]); active = '#/shop'; break;
    case 'studio': content = studio(state); break;
    case 'cart': content = cart(state); break;
    case 'confirmed': content = orderConfirmed(state, route.params[0]); active = '#/orders'; break;
    case 'orders': content = orders(state); break;
    case 'saved': content = saved(state); break;
    case 'admin': content = admin(state); break;
    case 'leads': content = leads(state); break;
    case 'about': content = about(); break;
    default: content = home(state);
  }
  if (route.name === 'home') return content; // full-bleed marketing page, no app chrome
  return layout(state, active, content);
}

// mount: called by app.js after innerHTML — the studio needs its listeners
export function mountRoute(state, route) {
  if (route.name !== 'studio') return null;
  const svg = document.getElementById('canvas');
  if (!svg) return null;
  const cleanup = mountStudio(svg, state, {
    onSelect(id) { ui.selectedId = id; rerender(); },
    onCommit(id, patch) { S.updateElement(state.currentDraft.activeView, id, patch); },
  });
  return { destroy: cleanup };
}

// ------------------------------------------------------------------ handlers
function result(res) {
  if (res && res.ok === false) { ui.notice = res.errors.join(' '); rerender(); return false; }
  ui.notice = null; return true;
}

export const actions = {
  toggleMenu() { document.documentElement.classList.toggle('menu-open'); },
  startDesign(el) { S.setDraft({ productId: el.dataset.product, colourId: el.dataset.colour }); ui.selectedId = null; location.hash = '#/studio'; },
  pickColour(el) { S.setDraft({ productId: el.dataset.product, colourId: el.dataset.colour }); rerender(); },
  pickTechnique(el) { S.setDraft({ productId: el.dataset.product, technique: el.dataset.tech }); rerender(); },
  addText() {
    const d = S.getState().currentDraft; const pa = R.printAreaFor(d.productId, d.activeView);
    const el = { id: R.uid(), type: 'text', text: 'YOUR TEXT', font: 'Impact', colour: colourById(d.colourId).dark ? '#FFFFFF' : '#14161A', size: 34, x: pa.x + pa.w / 2, y: pa.y + pa.h / 2, scale: 1, rotation: 0 };
    result(S.addElement(el)); ui.selectedId = el.id;
  },
  toggleGen() { ui.showGen = !ui.showGen; rerender(); },
  toggleVoice() { voiceInto('genPrompt'); },
  voiceToGen() { voiceInto('genPrompt'); },
  voiceToEnquiry() { voiceInto('enqNote'); },
  doGenerate() {
    const input = document.getElementById('genPrompt') || document.getElementById('genPromptFallback');
    const prompt = input ? input.value : '';
    if (!prompt.trim()) { ui.notice = 'Type or say a few words first.'; rerender(); return; }
    const s = S.getState(); const els = R.generateDesign(prompt, s.currentDraft.productId, s.currentDraft.activeView);
    S.clearView(s.currentDraft.activeView);
    els.forEach((e) => S.addElement(e));
    ui.notice = null; ui.selectedId = els[1] ? els[1].id : null;
  },
  clearView() { S.clearView(S.getState().currentDraft.activeView); ui.selectedId = null; },
  bringFront(el) { S.bringToFront(S.getState().currentDraft.activeView, el.dataset.id); },
  duplicateEl(el) { result(S.duplicateElement(S.getState().currentDraft.activeView, el.dataset.id)); },
  deleteEl(el) { S.removeElement(S.getState().currentDraft.activeView, el.dataset.id); ui.selectedId = null; },
  stepSize(el) { const d = S.getState().currentDraft; const cur = d.sizeBreakdown[el.dataset.size] || 0; S.setSizeQty(el.dataset.size, cur + Number(el.dataset.delta)); },
  addCart() { result(S.addToCart()); },
  goCheckout() {
    if (!R.hasArtwork(S.getState().currentDraft)) { ui.notice = 'Add some artwork before ordering.'; rerender(); return; }
    const r = S.addToCart(); if (!result(r)) return; location.hash = '#/cart';
  },
  removeCart(el) { S.removeFromCart(el.dataset.id); },
  reorder(el) { if (result(S.reorder(el.dataset.id))) location.hash = '#/studio'; },
  loadDesign(el) { if (result(S.loadDesign(el.dataset.id))) location.hash = '#/studio'; },
  deleteDesign(el) { S.deleteDesign(el.dataset.id); },
  saveDesignPrompt() { const name = prompt('Name this design', 'My design'); if (name) result(S.saveDesign(name)); },
  toggleEnquiry() { ui.enquiryOpen = !ui.enquiryOpen; rerender(); },
  openLead(el) { ui.openLead = ui.openLead === el.dataset.id ? null : el.dataset.id; rerender(); },
  convertLead(el) { result(S.convertLeadToOrder(el.dataset.id)); },
  exportArt(el) { download(el.dataset.id, 'art'); },
  exportMock(el) { download(el.dataset.id, 'mock'); },
};

function voiceInto(fieldId) {
  if (ui.listening) { ui.listening = false; rerender(); return; }
  ui.listening = true; rerender();
  const stop = AI.startDictation({
    onText(text) { const f = document.getElementById(fieldId); if (f) f.value = text; },
    onEnd() { ui.listening = false; rerender(); },
    onError(msg) { ui.listening = false; ui.notice = msg; rerender(); },
  });
  ui._stopVoice = stop;
}

function download(orderId, kind) {
  const s = S.getState(); const o = s.orders.find((x) => x.id === orderId); if (!o) return;
  const view = 'front';
  const svg = kind === 'art' ? artworkSVG(o.design, o.productId, view, 6) : fullSVG(o.design, o.productId, o.colourId, view);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${o.ref}-${kind === 'art' ? 'artwork' : 'mockup'}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const forms = {
  confirmOrder(form) {
    const d = Object.fromEntries(new FormData(form));
    const r = S.placeOrder({ name: d.name, phone: d.phone, email: d.email, note: d.note });
    if (!result(r)) return;
    location.hash = '#/confirmed/' + r.refs[0];
  },
  enquiry(form) {
    const d = Object.fromEntries(new FormData(form));
    const r = S.addLead({ ...d, source: 'Website enquiry' });
    if (result(r)) { ui.enquiryOpen = false; S.flash('ok', 'Enquiry received — it is on the pipeline with a follow-up date.'); }
  },
  addLeadNote(form) { const d = Object.fromEntries(new FormData(form)); result(S.addLeadNote(form.dataset.id, d.text)); form.reset(); },
};

export const changes = {
  role(el) { S.setUser(el.value); },
  pickColourInline(el) { S.setDraft({ colourId: el.dataset.colour }); },
  pickTechniqueInline(el) { S.setDraft({ technique: el.dataset.tech }); },
  setView(el) { S.setDraft({ activeView: el.dataset.view }); ui.selectedId = null; },
  setMode(el) { S.setMode(el.dataset.mode); },
  setQtyInput(el) { S.setQty(el.value); },
  setSizeInput(el) { S.setSizeQty(el.dataset.size, el.value); },
  editText(el) { S.updateElement(S.getState().currentDraft.activeView, el.dataset.id, { text: el.value }); },
  editFont(el) { S.updateElement(S.getState().currentDraft.activeView, el.dataset.id, { font: el.value }); },
  editColour(el) { S.updateElement(S.getState().currentDraft.activeView, el.dataset.id, { colour: el.value }); },
  commitElement(el) {
    const prop = el.dataset.prop; const v = Number(el.value);
    const patch = prop === 'scale' ? { scale: v / 100 } : { [prop]: v };
    S.updateElement(S.getState().currentDraft.activeView, el.dataset.id, patch);
  },
  setStatus(el) { if (el.value) result(S.setOrderStatus(el.dataset.id, el.value)); },
  setLeadStage(el) { result(S.setLeadStage(el.dataset.id, el.dataset.stage)); },
  setFollowUp(el) { result(S.setLeadFollowUp(el.dataset.id, el.value)); },
  async uploadArt(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    try {
      let src = await AI.readFileAsDataURL(file);
      const size = await AI.imageSize(src);
      if (!size.w) { ui.notice = 'That image could not be read.'; rerender(); return; }
      if (size.w < 600) ui.notice = 'Low resolution (' + size.w + 'px wide). It may print soft — 600px or more is better.';
      const d = S.getState().currentDraft; const pa = R.printAreaFor(d.productId, d.activeView);
      const maxW = pa.w * 0.9;
      const ratio = size.h / size.w;
      const w = Math.min(maxW, 220); const h = w * ratio;
      const elem = { id: R.uid(), type: 'image', src, w, h, x: pa.x + pa.w / 2, y: pa.y + pa.h / 2, scale: 1, rotation: 0 };
      result(S.addElement(elem)); ui.selectedId = elem.id;
    } catch (e) { ui.notice = e.message; rerender(); }
    el.value = '';
  },
};

// live (no re-render) slider updates: mutate draft + refresh just that element
export const lives = {
  liveElement(el) {
    const s = S.getState(); const view = s.currentDraft.activeView; const prop = el.dataset.prop; const v = Number(el.value);
    const els = R.viewElements(s.currentDraft, view); const e = els.find((x) => x.id === el.dataset.id); if (!e) return;
    if (prop === 'scale') e.scale = v / 100; else e[prop] = v;
    const readout = el.parentElement.querySelector('[data-readout="' + prop + '"]');
    if (readout) readout.textContent = prop === 'scale' ? v + '%' : (prop === 'rotation' ? v + '°' : v + 'px');
    const svg = document.getElementById('canvas'); if (svg) refreshElement(svg, s, e.id);
  },
  genVoiceHint() {},
};
