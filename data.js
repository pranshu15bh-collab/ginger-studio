// data.js — catalogue, colours, techniques, price tiers, and a small sample set.
// All prices are SAMPLE RATES (PRD C5 / [O2]): Shankar replaces them in one place.
// Money is integer paise. Canvas units are the SVG viewBox 640 x 760.

const R = (n) => Math.round(n * 100);
export const CANVAS = { w: 640, h: 760 };

// ------------------------------------------------------------------ colours
export const COLOURS = [
  { id: 'white', name: 'White', hex: '#FFFFFF', dark: false },
  { id: 'offwhite', name: 'Off-white', hex: '#F1EDE2', dark: false },
  { id: 'grey', name: 'Grey Melange', hex: '#B7BCC2', dark: false },
  { id: 'sky', name: 'Sky', hex: '#A9CBE8', dark: false },
  { id: 'pink', name: 'Blush Pink', hex: '#F2C6D3', dark: false },
  { id: 'black', name: 'Black', hex: '#14161A', dark: true },
  { id: 'navy', name: 'Navy', hex: '#1B2A5B', dark: true },
  { id: 'maroon', name: 'Maroon', hex: '#5A1E2A', dark: true },
  { id: 'teal', name: 'Teal', hex: '#0E6E6E', dark: true },
  { id: 'ginger', name: 'Ginger', hex: '#E4661E', dark: true },
  { id: 'olive', name: 'Olive', hex: '#55603A', dark: true },
  { id: 'royal', name: 'Royal Blue', hex: '#2A4FA8', dark: true },
];
export const colourById = (id) => COLOURS.find((c) => c.id === id) || COLOURS[0];

// ------------------------------------------------------------------ techniques
// surcharge is per unit, per print location. detail limits what the method can hold.
export const TECHNIQUES = [
  { id: 'dtf', name: 'DTF print', surcharge: R(80), detail: 'high', minQty: 1, note: 'Full colour, fine detail, gradients.' },
  { id: 'vinyl', name: 'Vinyl', surcharge: R(60), detail: 'low', minQty: 1, note: 'Solid shapes and bold text only — no gradients.' },
  { id: 'embroidery', name: 'Embroidery', surcharge: R(130), detail: 'flat', minQty: 1, note: 'Stitched. Bold shapes only — no fine detail, gradients or thin text.' },
  { id: 'screen', name: 'Screen print', surcharge: R(45), detail: 'high', minQty: 25, note: 'Best value from 25 pieces. One colour per screen.' },
];
export const techniqueById = (id) => TECHNIQUES.find((t) => t.id === id) || TECHNIQUES[0];

// ------------------------------------------------------------------ bulk tiers
export const TIERS = [
  { min: 100, factor: 0.70, label: '100+' },
  { min: 50, factor: 0.78, label: '50–99' },
  { min: 25, factor: 0.85, label: '25–49' },
  { min: 10, factor: 0.92, label: '10–24' },
  { min: 1, factor: 1.0, label: '1–9' },
];

// ------------------------------------------------------------------ design fonts (websafe, render in the export)
export const FONTS = [
  'Arial Black', 'Impact', 'Georgia', 'Trebuchet MS', 'Courier New', 'Verdana', 'Times New Roman', 'Arial',
];

// ------------------------------------------------------------------ garment shapes
// Simple, readable silhouettes drawn to the same 640x760 canvas so one coordinate
// system serves every product (the decision that must not drift — TECH-STACK §2).
const TEE_FRONT = 'M250,112 L120,156 L72,304 L192,292 L186,694 L454,694 L448,292 L568,304 L520,156 L390,112 C382,152 258,152 250,112 Z';
const TEE_BACK = 'M250,112 L120,156 L72,304 L192,292 L186,694 L454,694 L448,292 L568,304 L520,156 L390,112 C386,134 254,134 250,112 Z';

export const PRODUCTS = [
  {
    id: 'crew', name: 'Classic Crew Tee', category: 'T-shirts', basePrice: R(299),
    blurb: '180 GSM combed cotton. The everyday blank.',
    colours: ['white', 'black', 'navy', 'grey', 'maroon', 'teal', 'ginger', 'olive', 'royal', 'sky', 'pink', 'offwhite'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    views: {
      front: { path: TEE_FRONT, printArea: { x: 210, y: 232, w: 220, h: 316 }, collar: true },
      back: { path: TEE_BACK, printArea: { x: 205, y: 214, w: 230, h: 360 }, collar: false },
    },
  },
  {
    id: 'oversized', name: 'Oversized Tee', category: 'T-shirts', basePrice: R(399),
    blurb: '240 GSM, boxy drop-shoulder fit.',
    colours: ['white', 'black', 'offwhite', 'olive', 'maroon', 'teal', 'sky'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    views: {
      front: { path: 'M236,120 L96,168 L62,330 L200,312 L192,700 L448,700 L440,312 L578,330 L544,168 L404,120 C396,156 244,156 236,120 Z', printArea: { x: 198, y: 250, w: 244, h: 330 }, collar: true },
      back: { path: 'M236,120 L96,168 L62,330 L200,312 L192,700 L448,700 L440,312 L578,330 L544,168 L404,120 C400,140 240,140 236,120 Z', printArea: { x: 192, y: 228, w: 256, h: 372 }, collar: false },
    },
  },
  {
    id: 'polo', name: 'Collar Polo', category: 'T-shirts', basePrice: R(549),
    blurb: 'Pique knit with ribbed collar and placket.',
    colours: ['white', 'navy', 'black', 'maroon', 'teal', 'olive', 'grey'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    views: {
      front: { path: TEE_FRONT, printArea: { x: 222, y: 250, w: 196, h: 250 }, collar: true, placket: true },
      back: { path: TEE_BACK, printArea: { x: 210, y: 224, w: 220, h: 330 }, collar: false },
    },
  },
  {
    id: 'hoodie', name: 'Pullover Hoodie', category: 'Hoodies', basePrice: R(899),
    blurb: 'Fleece-back, kangaroo pocket, lined hood.',
    colours: ['black', 'navy', 'grey', 'maroon', 'olive', 'offwhite', 'teal'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    views: {
      front: { path: 'M240,150 L110,196 L78,470 L196,452 L188,706 L452,706 L444,452 L562,470 L530,196 L400,150 C392,188 248,188 240,150 Z', printArea: { x: 210, y: 290, w: 220, h: 230 }, collar: true, hood: true, pocket: true },
      back: { path: 'M240,150 L110,196 L78,470 L196,452 L188,706 L452,706 L444,452 L562,470 L530,196 L400,150 C396,172 244,172 240,150 Z', printArea: { x: 204, y: 266, w: 232, h: 300 }, collar: false, hood: true },
    },
  },
  {
    id: 'cap', name: 'Cap', category: 'Caps', basePrice: R(349),
    blurb: 'Structured 6-panel with curved brim.',
    colours: ['black', 'navy', 'white', 'grey', 'maroon', 'teal', 'olive', 'ginger'],
    sizes: ['Free'],
    views: {
      front: { path: 'M170,340 C170,238 250,196 320,196 C390,196 470,238 470,340 L470,356 L170,356 Z', printArea: { x: 228, y: 242, w: 184, h: 104 }, collar: false, brim: true },
      back: { path: 'M170,340 C170,238 250,196 320,196 C390,196 470,238 470,340 L470,356 L170,356 Z', printArea: { x: 252, y: 258, w: 136, h: 80 }, collar: false, brim: true },
    },
  },
];
export const productById = (id) => PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];

// ------------------------------------------------------------------ sample state
export const DEMO_TODAY = '2026-10-02';

function sampleDesign(elements) {
  return { views: { front: { elements: elements || [] }, back: { elements: [] } } };
}

export function seed() {
  return {
    meta: { version: 1, note: 'Sample data — sample rates, sample orders' },
    currentUserId: 'u1',
    users: [{ id: 'u1', name: 'Shankar (owner)', role: 'admin' }, { id: 'u2', name: 'Studio floor', role: 'staff' }],
    currentDraft: {
      productId: 'crew', colourId: 'white', technique: 'dtf', activeView: 'front', mode: 'personal',
      qty: 1, sizeBreakdown: { S: 0, M: 1, L: 0, XL: 0, XXL: 0 },
      views: { front: { elements: [] }, back: { elements: [] } },
      editingName: '',
    },
    savedDesigns: [
      { id: 'SD1', name: 'Adventure drop', createdAt: '2026-09-18', productId: 'crew', colourId: 'black', technique: 'dtf', design: sampleDesign([{ id: 'e1', type: 'text', text: 'ADVENTURE\nAWAITS', font: 'Impact', colour: '#FFFFFF', size: 46, x: 320, y: 340, scale: 1, rotation: 0 }]) },
      { id: 'SD2', name: 'College fest logo', createdAt: '2026-09-22', productId: 'oversized', colourId: 'navy', technique: 'vinyl', design: sampleDesign([{ id: 'e2', type: 'text', text: 'FEST 2026', font: 'Arial Black', colour: '#F2C6D3', size: 40, x: 320, y: 360, scale: 1, rotation: 0 }]) },
    ],
    cart: [],
    orders: [
      { id: 'O1', ref: 'GS-2601', customer: { name: 'Ritika (retail)', phone: '+91 90000 00001', email: '' }, productId: 'crew', colourId: 'black', technique: 'dtf', qty: 1, sizeBreakdown: { M: 1 }, unitPrice: R(379), total: R(379), status: 'printed', createdAt: '2026-09-24', mode: 'personal', design: sampleDesign([{ id: 'e1', type: 'text', text: 'ADVENTURE\nAWAITS', font: 'Impact', colour: '#FFFFFF', size: 46, x: 320, y: 340, scale: 1, rotation: 0 }]) },
      { id: 'O2', ref: 'GS-2602', customer: { name: 'ABC College', phone: '+91 90000 00002', email: 'fest@abc.edu' }, productId: 'oversized', colourId: 'navy', technique: 'vinyl', qty: 100, sizeBreakdown: { S: 20, M: 30, L: 30, XL: 20 }, unitPrice: R(360), total: R(36000), status: 'in_production', createdAt: '2026-09-26', mode: 'bulk', design: sampleDesign([{ id: 'e2', type: 'text', text: 'FEST 2026', font: 'Arial Black', colour: '#F2C6D3', size: 40, x: 320, y: 360, scale: 1, rotation: 0 }]) },
    ],
    leads: [
      { id: 'L1', name: 'Meridian Events', company: 'Meridian Events', phone: '+91 90000 00010', email: 'ops@meridian.example', productId: 'polo', qty: 250, note: 'Team polos, logo on chest, need by Diwali.', source: 'Website enquiry', stage: 'quoted', followUp: '2026-10-06', createdAt: '2026-09-28', notes: [{ at: '2026-09-30', text: 'Quote sent at ₹498/unit.' }] },
      { id: 'L2', name: 'Rann Utsav Stall', company: '', phone: '+91 90000 00011', email: '', productId: 'hoodie', qty: 60, note: 'Maroon hoodies for stall staff.', source: 'Instagram', stage: 'new', followUp: '2026-10-03', createdAt: '2026-10-01', notes: [] },
      { id: 'L3', name: 'Jaipur Half Marathon', company: 'JHM Trust', phone: '+91 90000 00012', email: 'kit@jhm.example', productId: 'crew', qty: 800, note: 'Event tees, mixed sizes, sponsor logos.', source: 'Referral', stage: 'contacted', followUp: '2026-10-04', createdAt: '2026-09-20', notes: [{ at: '2026-09-25', text: 'Asked for size sheet and deadline.' }] },
    ],
    loyalty: { points: 182, lifetimeOrders: 2 },
    audit: [
      { id: 'AU1', at: '2026-09-24T11:02:00', actor: 'u1', role: 'admin', entity: 'order', entityRef: 'GS-2601', action: 'created' },
      { id: 'AU2', at: '2026-09-26T15:20:00', actor: 'u1', role: 'admin', entity: 'order', entityRef: 'GS-2602', action: 'created' },
      { id: 'AU3', at: '2026-09-30T10:10:00', actor: 'u1', role: 'admin', entity: 'lead', entityRef: 'Meridian Events', action: 'quoted' },
    ],
    settings: { loyaltyPerRupee: 200, sampleRates: true, whatsapp: '919358814854' },
  };
}
