/* Generated product artwork (SVG strings), ported from the HTML prototype.
   Used until real photos are uploaded in admin. IDs are prefixed per render so pages
   with many SVGs never share clipPath/gradient ids. */

export type ArtColors = { label: string; accent: string; bg: string; jars?: string[]; withBox?: boolean; window?: boolean };
export type ArtProduct = {
  slug: string; title: string; type: string; art: ArtColors | null;
  ingredients?: string[]; contains?: string[]; highlights?: string[];
  variants: { title: string; swatch?: string | null }[];
};

const DEFAULT_ART: ArtColors = { label: '#1F4D3A', accent: '#C9A227', bg: '#F3EBD6' };
const SERIF = 'style="font-family:var(--serif)"';
const SANS = 'style="font-family:var(--sans)"';

let prefix = 'a', n = 0;
const uid = () => prefix + (++n).toString(36);
const begin = (p: string) => { prefix = p.replace(/[^a-zA-Z0-9]/g, '') || 'a'; n = 0; };

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shade(hex: string, amt: number) {
  const v = parseInt(hex.slice(1), 16); const r = v >> 16, g = (v >> 8) & 255, b = v & 255;
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return '#' + [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
/** Titles come from the database/admin, so escape everything that could break out of text or attributes. */
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function wrap(text: string, max: number) {
  const lines: string[] = []; let cur = '';
  for (const w of text.split(' ')) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines.slice(0, 3);
}

/* ---------- ingredient shapes ---------- */
const SH: Record<string, () => string> = {
  almond: () => `<path d="M0-13C8-9 9 7 0 14C-9 7-8-9 0-13Z" fill="#A9652F"/><path d="M0-9C3-4 3 6 0 10" stroke="#7d4520" stroke-width="1.3" fill="none" opacity=".55"/>`,
  cashew: () => `<path d="M-11-7C-14 7-1 16 10 10C3 8-3 2-3-6C-3-12-9-13-11-7Z" fill="#EDCF94" stroke="#cfa86a" stroke-width="1"/>`,
  pista: () => `<ellipse rx="7" ry="10" fill="#C9C27A"/><ellipse rx="4.5" ry="7.5" fill="#7FA23C"/>`,
  pumpkin: () => `<ellipse rx="4.5" ry="9" fill="#6E8F3A"/><ellipse rx="2" ry="6" fill="#89AC4E"/>`,
  sunflower: () => `<ellipse rx="3.5" ry="8" fill="#D8CDAA"/>`,
  melon: () => `<ellipse rx="4" ry="6.5" fill="#EEE3C4" stroke="#cdbf98" stroke-width=".8"/>`,
  poppy: () => `<circle r="1.6" fill="#EFE8D6"/><circle cx="4" cy="3" r="1.4" fill="#EFE8D6"/><circle cx="-3" cy="4" r="1.5" fill="#EFE8D6"/>`,
  cran: () => `<circle r="6.5" fill="#B3263A"/><circle cx="-2" cy="-2" r="2" fill="#e05a6c" opacity=".7"/>`,
  currant: () => `<circle r="4.5" fill="#2C1F33"/>`,
  blueberry: () => `<circle r="5.5" fill="#3A4C8C"/><circle cx="-1.5" cy="-1.5" r="1.6" fill="#7d8fd0" opacity=".7"/>`,
  raisin: () => `<path d="M-6-4C-2-8 6-6 6 0C6 6-2 8-6 4C-8 1-8-2-6-4Z" fill="#8A4B2A"/>`,
  raisinG: () => `<path d="M-6-4C-2-8 6-6 6 0C6 6-2 8-6 4C-8 1-8-2-6-4Z" fill="#B8A24A"/>`,
  date: () => `<ellipse rx="6.5" ry="13" fill="#5E3017"/><path d="M-2-9C1-3 1 4-2 9" stroke="#8a4a26" stroke-width="1.5" fill="none"/>`,
  kharekY: () => `<ellipse rx="6" ry="12" fill="#C99A4B"/><path d="M-2-8C1-3 1 4-2 8" stroke="#a87a32" stroke-width="1.4" fill="none"/>`,
  hazel: () => `<circle r="8" fill="#8A5A2B"/><path d="M-8-2C-4-8 4-8 8-2" fill="#C49A62"/>`,
  salt: () => `<rect x="-2.5" y="-2.5" width="5" height="5" fill="#F4C9C3" transform="rotate(20)"/>`,
  flax: () => `<ellipse rx="2.5" ry="5" fill="#7A4A26"/>`,
  sesame: () => `<ellipse rx="2" ry="3.6" fill="#F3E9CF"/>`,
  fennel: () => `<ellipse rx="1.8" ry="6" fill="#9BA35A"/>`,
  rose: () => `<path d="M0-8C6-6 6 4 0 8C-6 4-6-6 0-8Z" fill="#D9627A" opacity=".9"/>`,
  oat: () => `<ellipse rx="8" ry="5" fill="#E6D2A2" stroke="#cdb57d" stroke-width=".8"/>`,
  jaggery: () => `<rect x="-6" y="-5" width="12" height="10" rx="2" fill="#B9772A"/>`,
  spice: () => `<circle r="2" fill="#C1440E"/><circle cx="5" cy="3" r="1.5" fill="#D9711F"/><circle cx="-4" cy="4" r="1.8" fill="#9E2F0B"/>`,
  haldi: () => `<circle r="2.2" fill="#E3A21A"/><circle cx="4" cy="-3" r="1.6" fill="#F0B93A"/>`,
  soy: () => `<ellipse rx="7" ry="6" fill="#E4C27A" stroke="#c9a65c" stroke-width=".8"/>`,
  edamame: () => `<ellipse rx="7" ry="6" fill="#8DB45A"/>`,
  blackbean: () => `<ellipse rx="7" ry="5" fill="#26221F"/><path d="M-3 0h6" stroke="#fff" stroke-width="1" opacity=".5"/>`,
  piece: () => `<rect x="-11" y="-11" width="22" height="22" rx="5" fill="#5E3519"/><circle cx="-4" cy="-3" r="2" fill="#E8CF94"/><circle cx="4" cy="3" r="1.8" fill="#86A845"/><circle cx="3" cy="-5" r="1.5" fill="#B06A32"/>`,
};
const ING: Record<string, string | null> = {
  'Almonds': 'almond', 'Cashews': 'cashew', 'Pistachios': 'pista', 'Pumpkin Seeds': 'pumpkin', 'Sunflower Seeds': 'sunflower',
  'Poppy Seeds': 'poppy', 'Cranberries': 'cran', 'Black Currants': 'currant', 'Blueberries': 'blueberry', 'Dates': 'date',
  'Watermelon Seeds': 'melon', 'Hazelnuts': 'hazel', 'Pink Salt': 'salt', 'Kharek': 'date', 'Yellow Kharek': 'kharekY',
  'Raisins': 'raisin', 'Green Raisins': 'raisinG', 'Black Raisins': 'currant', 'Flax Seeds': 'flax', 'Sesame Seeds': 'sesame',
  'Fennel Seeds': 'fennel', 'Rose Petals': 'rose', 'Oats': 'oat', 'Jaggery': 'jaggery', 'Spices': 'spice', 'Soybeans': 'soy',
  'Edamame': 'edamame', 'Black Beans': 'blackbean', 'Turmeric': 'haldi', 'Honey': null, 'Cow Ghee': null, 'Olive Oil': null, 'Peanut Butter': null,
};
const shapesFor = (ings?: string[]) => { const s = (ings ?? []).map(i => ING[i]).filter((x): x is string => !!x); return s.length ? s : ['almond', 'cashew', 'pista', 'raisin']; };
const place = (k: string, x: number, y: number, a: number, s: number) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a | 0}) scale(${s.toFixed(2)})">${SH[k]()}</g>`;
function scatter(r: () => number, shapes: string[], count: number, x0: number, y0: number, w: number, h: number, smin = 1, smax = 1.5) {
  let out = '';
  for (let i = 0; i < count; i++) out += place(shapes[Math.floor(r() * shapes.length)], x0 + r() * w, y0 + r() * h, r() * 360, smin + r() * (smax - smin));
  return out;
}
const leaf = (x: number, y: number, a: number, s = 1, c = '#3E7B55') => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0C20-24 60-24 80 0C60 24 20 24 0 0Z" fill="${c}"/><path d="M4 0H74" stroke="${shade(c, -0.3)}" stroke-width="2" opacity=".5"/></g>`;

/* ---------- logo ---------- */
export function emblem(size = 48, ring = '#C9A227', fill = '#1F4D3A') {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="${fill}"/>
    <circle cx="32" cy="32" r="26.5" fill="none" stroke="${ring}" stroke-width="1.6" stroke-dasharray="1.5 3"/>
    <path d="M32 14C42 20 43 38 32 50C21 38 22 20 32 14Z" fill="${ring}"/>
    <path d="M32 19C35 27 35 38 32 46" stroke="${fill}" stroke-width="1.6" fill="none" opacity=".55"/>
    <path d="M33 15C36 8 44 7 48 9C46 14 40 17 33 15Z" fill="#7FB08A"/></svg>`;
}

/* ---------- objects ---------- */
type JarOpts = { label: string; accent: string; name: string; weight?: string; ings?: string[]; seed: string; base?: string };
function jar(o: JarOpts) {
  const id = uid(), r = rng(o.seed), shapes = shapesFor(o.ings);
  const lines = wrap(o.name, 11), fs = lines.length > 2 ? 21 : 25;
  const startY = lines.length > 2 ? 176 : lines.length === 2 ? 186 : 200;
  return `<g><defs>
      <clipPath id="c${id}"><rect x="0" y="52" width="220" height="250" rx="34"/></clipPath>
      <linearGradient id="gl${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".12" stop-color="#fff" stop-opacity=".08"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
      <linearGradient id="gd${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(o.accent, 0.35)}"/><stop offset=".5" stop-color="${o.accent}"/><stop offset="1" stop-color="${shade(o.accent, -0.25)}"/></linearGradient></defs>
    <ellipse cx="110" cy="304" rx="122" ry="13" fill="#000" opacity=".13"/>
    <g clip-path="url(#c${id})"><rect x="0" y="52" width="220" height="250" fill="${o.base ?? '#C9A06A'}"/>${scatter(r, shapes, 105, 0, 50, 220, 255, 1.1, 1.6)}</g>
    <rect x="0" y="52" width="220" height="250" rx="34" fill="url(#gl${id})" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
    <rect x="22" y="40" width="176" height="18" rx="4" fill="#fff" opacity=".45"/>
    <rect x="14" y="2" width="192" height="46" rx="10" fill="url(#gd${id})" stroke="${shade(o.accent, -0.35)}" stroke-width="1.2"/>
    ${Array.from({ length: 22 }, (_, i) => `<line x1="${24 + i * 8}" y1="9" x2="${24 + i * 8}" y2="41" stroke="${shade(o.accent, -0.4)}" stroke-opacity=".28" stroke-width="1.4"/>`).join('')}
    <rect x="0" y="116" width="220" height="142" fill="${o.label}"/>
    <rect x="9" y="125" width="202" height="124" rx="6" fill="none" stroke="${o.accent}" stroke-width="1.4" opacity=".9"/>
    <text x="110" y="150" text-anchor="middle" ${SANS} font-size="11" font-weight="700" letter-spacing="3" fill="${o.accent}">MEVA MANTRA</text>
    <path d="M86 158h48" stroke="${o.accent}" stroke-width="1" opacity=".7"/>
    ${lines.map((l, i) => `<text x="110" y="${startY + i * (fs + 3)}" text-anchor="middle" ${SERIF} font-size="${fs}" font-weight="600" fill="#FFF8E7">${esc(l)}</text>`).join('')}
    <text x="110" y="241" text-anchor="middle" ${SANS} font-size="9.5" font-weight="600" letter-spacing="1.6" fill="${o.accent}">${esc(o.weight ?? 'NO PRESERVATIVES')}</text>
    <rect x="0" y="52" width="220" height="250" rx="34" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/></g>`;
}

function box(o: { label: string; accent: string; name?: string; weight?: string }) {
  const L = o.label, A = o.accent;
  const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-30" rx="6" ry="13" transform="rotate(${i * 30})" fill="none" stroke="${A}" stroke-width="1.6"/>`).join('');
  const lines = wrap(o.name ?? 'Khajur Pak', 12);
  return `<g><ellipse cx="180" cy="236" rx="175" ry="14" fill="#000" opacity=".14"/>
    <polygon points="20,70 300,70 340,30 60,30" fill="${shade(L, 0.18)}"/>
    <polygon points="300,70 340,30 340,190 300,230" fill="${shade(L, -0.3)}"/>
    <rect x="20" y="70" width="280" height="160" fill="${L}"/>
    <rect x="20" y="70" width="280" height="10" fill="${A}" opacity=".85"/>
    <rect x="20" y="214" width="280" height="6" fill="${A}" opacity=".6"/>
    <g transform="translate(95 150)">${petals}<circle r="16" fill="${A}"/><circle r="44" fill="none" stroke="${A}" stroke-width="1.4" stroke-dasharray="2 4"/><circle r="8" fill="${L}"/></g>
    ${lines.map((l, i) => `<text x="215" y="${142 + i * 30 - (lines.length - 1) * 12}" text-anchor="middle" ${SERIF} font-size="26" font-weight="600" font-style="italic" fill="${A}">${esc(l)}</text>`).join('')}
    <text x="215" y="${180 + (lines.length - 1) * 8}" text-anchor="middle" ${SANS} font-size="10" font-weight="700" letter-spacing="3" fill="#FFF8E7">MEVA MANTRA</text>
    <text x="215" y="${198 + (lines.length - 1) * 8}" text-anchor="middle" ${SANS} font-size="9" letter-spacing="1.5" fill="${A}" opacity=".9">${esc(o.weight ?? 'NO REFINED SUGAR')}</text></g>`;
}

function tray(o: { label: string; accent: string; seed: string }) {
  const L = o.label, A = o.accent, r = rng(o.seed);
  const motif: string[] = [];
  for (let x = 50; x < 330; x += 26) for (let y = 4; y < 60; y += 24) motif.push(`<rect x="${x}" y="${y}" width="9" height="9" transform="rotate(45 ${x + 4.5} ${y + 4.5})" fill="${A}" opacity=".55"/>`);
  let pieces = '';
  const pw = (292 - 36) / 5, ph = (162 - 18) / 2;
  for (let c = 0; c < 5; c++) for (let rw = 0; rw < 2; rw++) {
    const x = 14 + 6 + c * (pw + 6), y = 94 + 6 + rw * (ph + 6);
    let speck = ''; for (let k = 0; k < 9; k++) speck += place(['cashew', 'pista', 'almond', 'pumpkin', 'melon'][k % 5], x + 8 + r() * (pw - 16), y + 8 + r() * (ph - 16), r() * 360, 0.45 + r() * 0.25);
    pieces += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="7" fill="#5E3519"/><rect x="${x}" y="${y}" width="${pw}" height="${ph * 0.35}" rx="7" fill="#7A4826" opacity=".55"/>${speck}`;
  }
  return `<g><ellipse cx="175" cy="262" rx="170" ry="12" fill="#000" opacity=".13"/><g transform="rotate(-4 170 140)">
    <rect x="30" y="0" width="300" height="90" rx="8" fill="${shade(L, -0.12)}"/>${motif.join('')}
    <rect x="140" y="18" width="80" height="44" rx="22" fill="${shade(L, 0.25)}" opacity=".5" stroke="${A}" stroke-width="1.5"/>
    <rect x="0" y="80" width="320" height="190" rx="8" fill="${L}"/><rect x="14" y="94" width="292" height="162" rx="4" fill="${A}"/>${pieces}</g></g>`;
}

function hamper(o: { label: string; accent: string }, inner = '') {
  const A = o.accent, L = o.label;
  let weave = ''; for (let y = 160; y < 290; y += 14) weave += `<path d="M${30 + (y - 140) * 0.2} ${y}H${310 - (y - 140) * 0.2}" stroke="#9E6A36" stroke-width="2" opacity=".6"/>`;
  for (let x = 40; x < 310; x += 18) weave += `<path d="M${x} 150L${x + (170 - x) * 0.12} 288" stroke="#9E6A36" stroke-width="1.5" opacity=".35"/>`;
  return `<g><ellipse cx="170" cy="298" rx="170" ry="13" fill="#000" opacity=".14"/>${inner}
    <path d="M20 140L320 140L292 290L48 290Z" fill="#C8955A"/>${weave}
    <path d="M10 132Q90 160 170 136Q250 160 332 132L332 152Q250 178 170 156Q90 178 10 152Z" fill="${L}"/>
    <rect x="6" y="126" width="330" height="18" rx="9" fill="#B07A44"/>
    <g transform="translate(170 196)"><path d="M0 0C-30-34-62-14-46 8C-34 24-10 10 0 0Z" fill="${A}"/><path d="M0 0C30-34 62-14 46 8C34 24 10 10 0 0Z" fill="${A}"/>
      <path d="M-4 4L-26 60L-12 54L-2 66Z" fill="${shade(A, -0.15)}"/><path d="M4 4L26 60L12 54L2 66Z" fill="${shade(A, -0.15)}"/><circle r="10" fill="${shade(A, -0.2)}"/></g></g>`;
}

function purse(color: string, A = '#C9A227') {
  const id = uid(); let pat = '';
  for (let y = 100; y < 290; y += 22) for (let x = 30; x < 300; x += 22) { const cx = x + ((y / 22) % 2) * 11; pat += `<circle cx="${cx}" cy="${y}" r="4" fill="none" stroke="${A}" stroke-width="1.2" opacity=".7"/><circle cx="${cx}" cy="${y}" r="1.4" fill="${A}" opacity=".8"/>`; }
  return `<g><defs><clipPath id="p${id}"><path d="M40 110Q40 90 60 90L260 90Q280 90 280 110L295 258Q297 280 277 280L43 280Q23 280 25 258Z"/></clipPath></defs>
    <ellipse cx="160" cy="286" rx="150" ry="11" fill="#000" opacity=".14"/>
    <path d="M95 92C95 22 225 22 225 92" stroke="${shade(color, -0.3)}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M40 110Q40 90 60 90L260 90Q280 90 280 110L295 258Q297 280 277 280L43 280Q23 280 25 258Z" fill="${color}"/>
    <g clip-path="url(#p${id})">${pat}</g>
    <path d="M38 92L282 92L272 168Q160 204 48 168Z" fill="${shade(color, -0.18)}"/>
    <path d="M48 168Q160 204 272 168" stroke="${A}" stroke-width="2" fill="none" stroke-dasharray="4 4"/>
    <rect x="148" y="166" width="24" height="30" rx="5" fill="${A}" stroke="${shade(A, -0.3)}" stroke-width="1.5"/><circle cx="160" cy="184" r="4" fill="${shade(A, -0.35)}"/></g>`;
}

function card(o: { label: string; accent: string }) {
  const A = o.accent, L = o.label;
  const petals = Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-22" rx="8" ry="14" transform="rotate(${i * 36})" fill="${i % 2 ? A : L}"/>`).join('');
  return `<g><ellipse cx="150" cy="318" rx="150" ry="10" fill="#000" opacity=".12"/>
    <rect x="40" y="10" width="220" height="300" rx="6" fill="#FFF8EC" stroke="${A}" stroke-width="2"/>
    <rect x="54" y="24" width="192" height="272" rx="4" fill="none" stroke="${L}" stroke-width="1" stroke-dasharray="3 4"/>
    <text x="150" y="88" text-anchor="middle" ${SERIF} font-size="26" font-style="italic" fill="${L}">Happy</text>
    <text x="150" y="122" text-anchor="middle" ${SERIF} font-size="28" font-weight="600" fill="${L}">Raksha</text>
    <text x="150" y="154" text-anchor="middle" ${SERIF} font-size="28" font-weight="600" fill="${L}">Bandhan</text>
    <path d="M-10 250C60 230 100 236 150 240C200 236 240 230 310 250" stroke="${L}" stroke-width="5" fill="none"/>
    <path d="M-10 256C60 236 100 242 150 246C200 242 240 236 310 256" stroke="${A}" stroke-width="3" fill="none"/>
    <g transform="translate(150 242)">${petals}<circle r="15" fill="${A}"/><circle r="8" fill="${L}"/><circle r="3" fill="#fff"/></g></g>`;
}

function bowl(r: () => number, shapes: string[], w = 200) {
  const id = uid();
  return `<g><defs><clipPath id="b${id}"><ellipse cx="${w / 2}" cy="40" rx="${w / 2 - 6}" ry="44"/></clipPath></defs>
    <ellipse cx="${w / 2}" cy="122" rx="${w / 2}" ry="12" fill="#000" opacity=".12"/>
    <g clip-path="url(#b${id})">${scatter(r, shapes, 55, 6, -4, w - 12, 60, 1, 1.4)}</g>
    <path d="M0 40Q0 120 ${w / 2} 120Q${w} 120 ${w} 40Z" fill="#E8DCC3"/>
    <path d="M0 40Q0 120 ${w / 2} 120Q${w} 120 ${w} 40" fill="none" stroke="#cbb994" stroke-width="2"/>
    <path d="M14 58Q${w / 2} 84 ${w - 14} 58" stroke="#1F4D3A" stroke-width="3" fill="none" opacity=".5"/></g>`;
}

const colorsOf = (p: ArtProduct) => p.art ?? DEFAULT_ART;

function object(p: ArtProduct, variant = 0): { svg: string; w: number; h: number } {
  const a = colorsOf(p), seed = p.slug, v = p.variants[variant] ?? p.variants[0] ?? { title: '' };
  const base = { label: a.label, accent: a.accent, ings: p.ingredients, seed };
  switch (p.type.toLowerCase()) {
    case 'box': return a.window ? { svg: tray(base), w: 340, h: 275 } : { svg: box({ ...base, name: 'Khajur Pak', weight: v.title === 'Hamper' ? 'WITH RAKHI & CARD' : 'NET WT. ' + v.title.toUpperCase() }), w: 350, h: 250 };
    case 'card': return { svg: card(base), w: 300, h: 330 };
    case 'purse': {
      const col = v.swatch || a.label;
      const sj = jar({ label: '#1F4D3A', accent: '#C9A227', name: 'Dry Fruit Mix', weight: 'NET WT. 150 G', ings: ['Almonds', 'Cashews', 'Pistachios', 'Cranberries'], seed });
      const sb = box({ label: '#7A1F2B', accent: '#C9A227', name: 'Khajur Pak', weight: 'NET WT. 400 G' });
      return { svg: `<g transform="translate(40 0)">${purse(col)}</g><g transform="translate(0 170) scale(.5)">${sb}</g><g transform="translate(270 150) scale(.48)">${sj}</g>`, w: 380, h: 300 };
    }
    case 'hamper': {
      const j1 = jar({ label: '#1F4D3A', accent: '#C9A227', name: 'Dry Fruit Mix', ings: ['Almonds', 'Cashews', 'Pistachios'], seed: seed + 1 });
      const j2 = jar({ label: '#C1440E', accent: '#E6C766', name: 'Masala Mix', ings: ['Almonds', 'Cashews', 'Spices'], seed: seed + 2 });
      const b = box({ label: a.label, accent: a.accent, name: 'Khajur Pak' });
      return { svg: hamper(base, `<g transform="translate(40 8) scale(.5)">${j1}</g><g transform="translate(200 0) scale(.5)">${j2}</g><g transform="translate(110 40) scale(.4)">${b}</g>`), w: 340, h: 305 };
    }
    case 'combo': {
      const cols = a.jars ?? ['#1F4D3A', '#C1440E', '#D9961A'];
      const names = (p.contains ?? []).map(c => c.replace(/\s*\(.*\)/, '').replace('Dryfruit', 'Dry Fruit'));
      const jarNames = names.filter(nm => !/Khajur/.test(nm));
      const back = a.withBox || /Khajur/.test(names.join()) ? `<g transform="translate(${a.withBox ? 170 : 90} 0) scale(${a.withBox ? 0.78 : 0.7})">${box({ label: '#6B3F22', accent: '#C9A227', name: 'Khajur Pak', weight: 'NET WT. 400 G' })}</g>` : '';
      const count = a.withBox ? 1 : 3;
      let front = '';
      for (let i = 0; i < count; i++) {
        front += `<g transform="translate(${a.withBox ? 20 : 10 + i * 118} ${a.withBox ? 60 : 120}) scale(${a.withBox ? 0.82 : 0.62})">${jar({ label: cols[i % cols.length], accent: '#E6C766', name: jarNames[i] ?? 'Dry Fruit Mix', ings: p.ingredients, seed: seed + i, weight: 'MEVA MANTRA COMBO' })}</g>`;
      }
      return { svg: back + front, w: a.withBox ? 450 : 370, h: 320 };
    }
    default: return { svg: jar({ ...base, name: p.title, weight: 'NET WT. ' + v.title.toUpperCase() }), w: 220, h: 310 };
  }
}

function frame(p: ArtProduct, inner: string, bg?: string) {
  const id = uid();
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(p.title)}" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="r${id}" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="600" height="600" fill="${bg ?? colorsOf(p).bg}"/><rect width="600" height="600" fill="url(#r${id})"/>${inner}</svg>`;
}
function fit(obj: { svg: string; w: number; h: number }, cx: number, cy: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / obj.w, maxH / obj.h);
  return `<g transform="translate(${(cx - (obj.w * s) / 2).toFixed(1)} ${(cy - (obj.h * s) / 2).toFixed(1)}) scale(${s.toFixed(3)})">${obj.svg}</g>`;
}

const ICONS: Record<string, string> = {
  sugar: '<path d="M-12-12h24v24h-24z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-18 18L18-18" stroke="currentColor" stroke-width="3"/>',
  shield: '<path d="M0-18L16-11V2C16 11 8 17 0 20C-8 17-16 11-16 2V-11Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-7 1L-2 6L8-5" stroke="currentColor" stroke-width="3" fill="none"/>',
  drop: '<path d="M0-18C8-6 13 2 13 7A13 13 0 0 1-13 7C-13 2-8-6 0-18Z" fill="none" stroke="currentColor" stroke-width="3"/>',
  leaf: '<path d="M-14 14C-14-6 0-16 16-16C16 4 6 16-14 14Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M-14 14L6-6" stroke="currentColor" stroke-width="3"/>',
};

/** Square 600×600 product image. i: 0 product, 1 ingredients, 2 highlights, 3 lifestyle. */
export function view(p: ArtProduct, i = 0, variant = 0, idPrefix = 'v') {
  begin(idPrefix);
  const a = colorsOf(p), r = rng(p.slug + i), shapes = shapesFor(p.ingredients);
  const obj = object(p, variant);
  if (i === 0) {
    return frame(p, `<circle cx="300" cy="290" r="230" fill="none" stroke="${a.accent}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="2 10"/>
      ${leaf(40, 90, -30, 1.1)}${leaf(560, 470, 150, 1, '#5A8F64')}${leaf(520, 70, 200, 0.7, '#7FB08A')}
      ${fit(obj, 300, 300, 400, 400)}${scatter(r, shapes, 9, 60, 505, 480, 50, 1.4, 1.9)}`);
  }
  if (i === 1) {
    const list = p.contains?.length ? p.contains : p.ingredients ?? [];
    const items = list.slice(0, 10).map((ing, k) => {
      const x = 70 + (k % 2) * 250, y = 175 + Math.floor(k / 2) * 78, sh = ING[ing];
      const icon = sh ? place(sh, x + 26, y, 0, 1.5) : `<text x="${x + 26}" y="${y + 6}" text-anchor="middle" font-size="18" fill="${a.label}">✦</text>`;
      const lines = wrap(ing, 16).slice(0, 2);
      return `<circle cx="${x + 26}" cy="${y}" r="27" fill="#fff" stroke="${a.accent}" stroke-width="2"/>${icon}
        ${lines.map((t, j) => `<text x="${x + 64}" y="${y + 6 + (j - 0.5 * (lines.length - 1)) * 20}" ${SANS} font-size="18" font-weight="600" fill="#1E1E1E">${esc(t)}</text>`).join('')}`;
    }).join('');
    return frame(p, `<text x="300" y="80" text-anchor="middle" ${SERIF} font-size="40" font-weight="600" fill="#1F4D3A">${p.contains?.length ? 'In the Box' : 'What’s Inside'}</text>
      <path d="M250 104h100" stroke="#C9A227" stroke-width="3"/>${items}
      <text x="300" y="${list.length > 8 ? 580 : 560}" text-anchor="middle" ${SANS} font-size="14" letter-spacing="3" fill="#5F6B63">${list.length > 10 ? '+ ' + (list.length - 10) + ' MORE · ' : ''}MEVA MANTRA</text>`, '#FBF7EF');
  }
  if (i === 2) {
    const pick = (t: string) => /sugar|sweet/i.test(t) ? 'sugar' : /preserv|flavour|clean/i.test(t) ? 'shield' : /ghee|oil|salt|honey/i.test(t) ? 'drop' : 'leaf';
    const tiles = (p.highlights ?? []).slice(0, 4).map((t, k) => {
      const x = 165 + (k % 2) * 270, y = 220 + Math.floor(k / 2) * 190;
      return `<circle cx="${x}" cy="${y}" r="52" fill="${a.accent}"/><g transform="translate(${x} ${y}) scale(1.6)" color="${a.label}">${ICONS[pick(t)]}</g>
        ${wrap(t, 14).map((l, j) => `<text x="${x}" y="${y + 88 + j * 24}" text-anchor="middle" ${SANS} font-size="21" font-weight="600" fill="#FFF8E7">${esc(l)}</text>`).join('')}`;
    }).join('');
    return frame(p, `<text x="300" y="96" text-anchor="middle" ${SERIF} font-size="38" font-weight="600" fill="#FFF8E7">Why you’ll love it</text>
      <path d="M250 120h100" stroke="${a.accent}" stroke-width="3"/>${tiles}`, a.label);
  }
  const bowlShapes = /box|card/i.test(p.type) ? ['piece'] : shapes;
  return frame(p, `<rect y="430" width="600" height="170" fill="#C79B6A"/><rect y="430" width="600" height="8" fill="#A97E50"/>
    ${Array.from({ length: 6 }, (_, k) => `<path d="M0 ${460 + k * 24}C150 ${452 + k * 24} 300 ${468 + k * 24} 600 ${458 + k * 24}" stroke="#B08758" stroke-width="2" fill="none" opacity=".6"/>`).join('')}
    ${leaf(-10, 120, -20, 1.4)}${leaf(20, 210, 10, 1.1, '#5A8F64')}
    ${fit(obj, 390, 300, 300, 300)}<g transform="translate(40 360)">${bowl(r, bowlShapes, 220)}</g>
    ${scatter(r, shapes, 6, 300, 470, 260, 60, 1.4, 1.8)}`, shade(a.bg, -0.04));
}

/** 700×560 hero scenes. `find` resolves a product slug to its art data. */
export function hero(k: number, find: (slug: string) => ArtProduct | undefined, idPrefix = 'h') {
  begin(idPrefix);
  const r = rng('hero' + k);
  const j = (slug: string, x: number, y: number, s: number) => { const p = find(slug); return p ? `<g transform="translate(${x} ${y}) scale(${s})">${object(p).svg}</g>` : ''; };
  const ings = find('mix-dryfruit')?.ingredients;
  const bg = `<circle cx="360" cy="300" r="250" fill="#C9A227" opacity=".16"/><circle cx="360" cy="300" r="250" fill="none" stroke="#C9A227" stroke-width="2" stroke-dasharray="2 10"/>`;
  let inner = '';
  if (k === 0) inner = `${leaf(90, 120, -40, 1.3)}${leaf(560, 90, 210, 1)}${j('masala-dryfruit-mix', 90, 190, 0.92)}${j('classic-granola', 420, 190, 0.92)}${j('mix-dryfruit', 245, 110, 1.08)}<g transform="translate(40 410)">${bowl(r, shapesFor(ings), 210)}</g>${scatter(r, ['almond', 'cashew', 'pista', 'cran'], 8, 300, 500, 330, 40, 1.4, 1.8)}`;
  if (k === 1) inner = `${leaf(560, 110, 210, 1.2)}${leaf(80, 140, -30, 1)}${j('dryfruit-khajur-pak', 90, 120, 0.95)}${j('khajur-pak-gifting-box-3', 280, 250, 1.05)}${scatter(r, ['date', 'almond', 'pista', 'cashew'], 10, 80, 500, 560, 40, 1.4, 1.9)}`;
  if (k === 2) inner = `${leaf(80, 120, -30, 1.2)}${leaf(580, 420, 160, 1)}${j('khajur-pak-gifting-box-4', 40, 250, 0.8)}${j('diwali-gift-hamper', 330, 150, 1.05)}${scatter(r, ['almond', 'cashew', 'date', 'pista'], 8, 120, 505, 500, 30, 1.4, 1.8)}`;
  return `<svg viewBox="0 0 700 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Meva Mantra products">${bg}${inner}</svg>`;
}

/** 800×450 wide scene for blog covers. */
export function banner(p: ArtProduct, idPrefix = 'b') {
  begin(idPrefix);
  const r = rng('banner' + p.slug), obj = object(p), a = colorsOf(p);
  return `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(p.title)}"><rect width="800" height="450" fill="${a.bg}"/>
    <circle cx="560" cy="220" r="200" fill="${a.accent}" opacity=".18"/>${leaf(60, 80, -20, 1.4)}${leaf(740, 380, 170, 1.2, '#5A8F64')}
    ${fit(obj, 560, 225, 330, 330)}${scatter(r, shapesFor(p.ingredients), 14, 40, 200, 300, 220, 1.6, 2.4)}</svg>`;
}
