// app.js — boot, hash router, event delegation.
import { load, subscribe, getState, clearFlash } from './store.js';
import { render, mountRoute, setRerender, actions, forms, changes, lives, ui } from './views.js';

function parseHash() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  const clean = raw.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  const head = parts[0] || 'home';
  const params = parts.slice(1);
  const names = { '': 'home', home: 'home', shop: 'shop', product: 'product', studio: 'studio', cart: 'cart', confirmed: 'confirmed', orders: 'orders', saved: 'saved', admin: 'admin', leads: 'leads', about: 'about' };
  return { name: names[head] || 'home', params, hash: '#/' + parts.join('/') };
}

let mounted = null;
let flashTimer = null;

function decorateTables(root) {
  root.querySelectorAll('table.table').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach((tr) => { [...tr.children].forEach((td, i) => { if (heads[i]) td.setAttribute('data-label', heads[i]); }); });
  });
}

function draw() {
  const state = getState();
  const route = parseHash();
  const app = document.getElementById('app');
  if (mounted && mounted.destroy) mounted.destroy();
  mounted = null;
  app.innerHTML = render(state, route);
  decorateTables(app);
  if (ui.notice) {
    // shown inside the studio view already; elsewhere as a banner
    const host = app.querySelector('.content');
    if (host && !host.querySelector('.flash')) { const b = document.createElement('div'); b.className = 'flash flash--warn'; b.textContent = ui.notice; host.prepend(b); }
  }
  mounted = mountRoute(state, route);
  document.documentElement.classList.toggle('is-site', route.name === 'home');
  if (state.flash && !flashTimer) flashTimer = setTimeout(() => { flashTimer = null; clearFlash(); }, 4200);
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return; e.preventDefault();
  const fn = forms[form.dataset.form]; if (fn) fn(form, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = changes[el.dataset.change]; if (fn) fn(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-live]');
  if (!el) return;
  const fn = lives[el.dataset.live]; if (fn) fn(el, e);
});
window.addEventListener('hashchange', () => { document.documentElement.classList.remove('menu-open'); draw(); });

load();
subscribe(draw);
setRerender(draw);
draw();
