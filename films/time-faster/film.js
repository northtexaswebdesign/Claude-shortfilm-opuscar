// Why Time Feels Faster as You Get Older — one sketchbook page, a 2D camera over it.
import { INK, PAPER, clamp, lerp, ss, TAU, rng, n2, fbm, rgba, hex, mix3, spline, ellipse, rough, penStroke, drawPen, wash, dab, figure, drawPrims, handwrite, R3 } from './engine.js';
import { stand, walk, mixPose } from './poses.js';
import { T, VO, DUR, BEAT } from './timeline.js';
const { V } = R3;

const SW = innerWidth || 1920, SH = innerHeight || 1080;
const cv = document.getElementById('c'); cv.width = SW; cv.height = SH;
const ctx = cv.getContext('2d');
const PW = 9000, PH = 5063;                       // the page, 16:9
const subs = await (await fetch('subs.json')).json();

// ---------------- helpers ----------------
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const prog = (t, a, d) => clamp((t - a) / d);
const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
const panOf = x => clamp((x / PW) * 2 - 1, -.8, .8);

// static ink: strokes with draw-on times
const INKS = [];
function ink(pts, t0, dur, o = {}) {
  const st = penStroke(pts, { w: o.w ?? 3, wob: o.wob ?? 1.1, over: o.over ?? 6, gap: o.gap ?? .4, seed: o.seed ?? (INKS.length * 7 + 3), smooth: o.smooth });
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of st.P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const it = { st, t0, dur, alpha: o.alpha ?? 1, bb: [x0, y0, x1, y1], until: o.until ?? 1e9 };
  INKS.push(it); return it;
}
// a group of strokes drawn one after another between t0 and t0+dur (time shared by length), one pen sound per stroke
function inkGroup(list, t0, dur, o = {}) {
  const lens = list.map(p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return Math.max(L, 20); });
  const tot = lens.reduce((a, b) => a + b, 0); let t = t0;
  list.forEach((p, i) => { const d = dur * lens[i] / tot; ink(p, t, d * .92, { ...o, seed: (o.seed ?? 11) + i * 13 }); if (!o.quiet) ev(t, 'pen', { d: +(d * .92).toFixed(3), pan: panOf(p[0][0]), b: o.bright ?? 0 }); t += d; });
}
// handwriting placed on the page
const TXT = [];
function note(text, x, y, size, t0, dur, o = {}) { TXT.push({ text, x, y, size, t0, dur, o, id: o.id ?? text }); if (!o.quiet) ev(t0, 'write', { d: dur, pan: panOf(x) }); }

// noisy circle for colour that blooms from a point
function blob(cx, cy, r, seed, n = 56) {
  const P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + .32 * (fbm(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, seed, 3) - .5) + .1 * (n2(Math.cos(a) * 7 + seed, Math.sin(a) * 7, seed) - .5); const e = r * k + Math.min(1, r / 300) * (80 * (n2(Math.cos(a) * 18 + seed, Math.sin(a) * 18, seed + 2) - .5) + 26 * (n2(Math.cos(a) * 70 + seed, Math.sin(a) * 70, seed + 3) - .5)); P.push([cx + Math.cos(a) * e, cy + Math.sin(a) * e]); }
  return P;
}
const pathOf = (c, P) => { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); };

// a colour layer drawn once into its own canvas, revealed by blooms
function layer(x0, y0, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.translate(-x0, -y0); return { c, g, x0, y0, w, h, src: [] }; }
function drawLayer(L, t) {
  const live = L.src.map(s => ({ s, r: s.v * Math.max(0, t - s.t) + (t > s.t ? s.r0 ?? 30 : 0) })).filter(o => o.r > 0);
  if (!live.length) return;
  ctx.save(); ctx.beginPath(); const nn = r => Math.min(480, Math.max(56, r / 8 | 0));
  for (const { s, r } of live) { const rr = Math.min(r, s.R ?? 1e9); pathOf(ctx, blob(s.x, s.y, rr, s.seed ?? 3, nn(rr))); } ctx.clip();
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(L.c, L.x0, L.y0); ctx.restore();
  // wet front: a darker band just behind the edge while it still moves
  ctx.save(); ctx.beginPath();
  let any = false;
  for (const { s, r } of live) { if (r >= (s.R ?? 1e9)) continue; any = true; pathOf(ctx, blob(s.x, s.y, r, s.seed ?? 3, nn(r))); pathOf(ctx, blob(s.x, s.y, r * .9 - 12, s.seed ?? 3, nn(r)).reverse()); }
  if (any) { ctx.clip('evenodd'); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .45; ctx.drawImage(L.c, L.x0, L.y0); }
  ctx.restore();
}
// fray a layer's edge: a noisy elliptical falloff so colour never ends in a straight line
function fray(L, cx, cy, rx, ry, seed) {
  const k = 8, w = Math.ceil(L.w / k), h = Math.ceil(L.h / k), m = document.createElement('canvas'); m.width = w; m.height = h;
  const g = m.getContext('2d'), im = g.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = L.x0 + i * k, y = L.y0 + j * k, d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const v = clamp((1 - d) * 3.2 + (fbm(x * .004, y * .004, seed, 3) - .5) * 1.6 + (n2(x * .03, y * .03, seed + 1) - .5) * .9);
    im.data[(j * w + i) * 4 + 3] = v * 255;
  }
  g.putImageData(im, 0, 0);
  L.g.save(); L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.globalCompositeOperation = 'destination-in'; L.g.imageSmoothingEnabled = true; L.g.drawImage(m, 0, 0, L.w, L.h); L.g.restore();
}
const reach = (L, x, y) => { let best = 1e9; for (const s of L.src) { const d = Math.hypot(x - s.x, y - s.y); best = Math.min(best, s.t + Math.max(0, d - (s.r0 ?? 30)) / s.v); } return best; };

// ---------------- paper ----------------
const MS = 6, mott = document.createElement('canvas'); mott.width = PW / MS | 0; mott.height = PH / MS | 0;
{ const g = mott.getContext('2d'), im = g.createImageData(mott.width, mott.height);
  for (let j = 0; j < mott.height; j++) for (let i = 0; i < mott.width; i++) {
    const x = i * MS, y = j * MS, k = 1 + .045 * ((fbm(x * .0011, y * .0011, 4, 3) - .5) * 2) + .025 * ((n2(x * .0062, y * .0062, 9) - .5) * 2);
    const o = (j * mott.width + i) * 4; im.data[o] = PAPER[0] * k; im.data[o + 1] = PAPER[1] * k; im.data[o + 2] = PAPER[2] * k; im.data[o + 3] = 255;
  } g.putImageData(im, 0, 0); }
const tooth = document.createElement('canvas'); tooth.width = tooth.height = 384;
{ const g = tooth.getContext('2d'), im = g.createImageData(384, 384), R = rng(77);
  for (let i = 0; i < 384 * 384; i++) { const v = 255 - (R() < .35 ? R() * 26 : R() * 8); im.data[i * 4] = v; im.data[i * 4 + 1] = v * .995; im.data[i * 4 + 2] = v * .985; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); }
const toothPat = ctx.createPattern(tooth, 'repeat');

// ---------------- the life ruler ----------------
const RY = 4000, RX0 = 500, PX = 160; const ax = a => RX0 + a * PX;
const ruler = layer(RX0 - 300, RY - 800, 50 * PX + 600, 1000);
const RULER = ink([[ax(0) - 10, RY + 2], [ax(12), RY - 3], [ax(25), RY + 4], [ax(38), RY - 2], [ax(50) + 12, RY + 1]], 0, 0, { w: 4.2, wob: 1.6, over: 10, gap: 0, seed: 501 });
// drawn in two parts: 0→5 years, then 5→50 during the pull-back
RULER.custom = t => .1 * prog(t, 15.0, .9) + .9 * prog(t, 20.9, 2.0);
ev(15.0, 'pen', { d: .9, pan: -.7, b: .2 }); ev(20.9, 'pen', { d: 2.0, pan: 0, b: .1 });
for (let a = 0; a <= 50; a++) {
  const reachT = a <= 5 ? 15.0 + .9 * a / 5 : 20.9 + 2.0 * (a - 5) / 45;
  const big = a % 10 === 0 || a <= 5, mid = a % 5 === 0;
  ink([[ax(a), RY - (big ? 34 : mid ? 26 : 16)], [ax(a) + 1, RY + (big ? 30 : 14)]], reachT, .12, { w: big ? 3.2 : 2.2, over: 2, gap: 0, seed: 600 + a });
  if (a <= 5) note(String(a), ax(a), RY + 82, 46, reachT + .05, .15, { align: 'center', quiet: true, id: 'r' + a });
  else if (a % 10 === 0) note(String(a), ax(a), RY + 118, 90, reachT + .05, .2, { align: 'center', quiet: true, id: 'r' + a });
}
note('age', ax(0) - 40, RY + 82, 40, 15.25, .3, { align: 'right', font: 'Reenie Beanie', id: 'age' });
// one year of five (age 4→5), one year of fifty (49→50)
const slice = (a, col, t, seed) => { const P = [[ax(a) + 4, RY - 30], [ax(a + 1) - 4, RY - 32], [ax(a + 1) - 3, RY + 26], [ax(a) + 3, RY + 28]]; wash(ruler.g, P, col, { a: .7, j: 3, layers: 3, edge: .4, seed }); ruler.src.push({ x: ax(a + .5), y: RY, t, v: 260, r0: 10, R: 120, seed }); };
slice(4, hex('#d97757'), T.fifth, 41); slice(49, hex('#d97757'), T.fiftieth, 42);
inkGroup([[[ax(4) + 6, RY - 60], [ax(4) + 4, RY - 78], [ax(5) - 4, RY - 79], [ax(5) - 6, RY - 60]]], T.fifth + .3, .35, { w: 2.4, seed: 701 });
note('1 year = 1/5 of your life', ax(4.5), RY - 100, 36, T.fifth + .7, .9, { align: 'center', id: 'fifth' });
inkGroup([[[ax(49) - 30, RY - 120], [ax(49) - 10, RY - 170], [ax(49.5), RY - 200]]], T.fiftieth + .2, .3, { w: 3, seed: 702 });
note('1 year = 1/50', ax(49.6), RY - 230, 140, T.fiftieth + .4, .7, { align: 'right', id: 'fiftieth' });

// memories: colour dabs along the ruler, some with a tiny drawing
const MEM = [];
{ const R = rng(9);
  const iconAt = { 5.5: 'bag', 7.5: 'wave', 3: 'balloon', 9.5: 'bike', 11.5: 'cake', 13.5: 'star', 16: 'house', 18.5: 'heart' };
  const cols = ['#c9573f', '#e2b04a', '#7fa6b8', '#7fa04a', '#b58fb0', '#d97757', '#9fbcd6', '#c3c96f'].map(hex);
  const ages = []; for (let a = .6; a < 20; a += .38 + R() * .3) ages.push(a);
  for (const a of [21.5, 24.3, 28.6, 33.1]) ages.push(a);                        // adult years: almost none
  for (let a = 38.4; a < 50; a += .45 + R() * .35) ages.push(a);                 // the new years, at the end
  for (const k of Object.keys(iconAt)) ages.push(+k);
  ages.sort((a, b) => a - b);
  for (const a of ages) {
    const icon = iconAt[a] ?? null, late = a > 38;
    const t = icon === 'bag' ? T.bag : icon === 'wave' ? T.sea : late ? T.final + .6 + (a - 38.4) * .24 : T.memories + a * .45;
    const x = ax(a), y = RY - 150 - (icon ? 190 : 40 + R() * 300), r = icon ? 70 : 22 + R() * 30;
    MEM.push({ a, x, y, r, t, icon, col: cols[(R() * cols.length) | 0], seed: 900 + MEM.length });
  }
}
for (const m of MEM) {
  if (m.icon) {
    wash(ruler.g, blob(m.x, m.y, m.r * 1.15, m.seed), m.col, { a: .42, j: 6, layers: 3, edge: .3, seed: m.seed });
    // tiny sketch of the memory
    const x = m.x, y = m.y, s = m.r * .62, P = [];
    if (m.icon === 'bag') P.push([[x - s, y - s * .6], [x + s, y - s * .62], [x + s * 1.02, y + s], [x - s, y + s * 1.02], [x - s, y - s * .6]], [[x - s, y - s * .55], [x, y + s * .1], [x + s, y - s * .55]], [[x - s * .4, y - s * .62], [x - s * .3, y - s * 1.1], [x + s * .3, y - s * 1.1], [x + s * .4, y - s * .62]]);
    if (m.icon === 'wave') P.push([[x - s * 1.3, y + s * .4], [x - s * .6, y - s * .2], [x, y - s * .6], [x + s * .5, y - s * .4], [x + s * .4, y], [x + s * .1, y - s * .05]], [[x - s * 1.3, y + s * .9], [x - s * .4, y + s * .6], [x + s * .4, y + s * .95], [x + s * 1.3, y + s * .6]]);
    if (m.icon === 'balloon') P.push(ellipse(x, y - s * .3, s * .7, s * .85, 14).concat([[x + s * .7, y - s * .3]]), [[x, y + s * .55], [x - s * .2, y + s * .9], [x + s * .1, y + s * 1.3]]);
    if (m.icon === 'bike') P.push(ellipse(x - s * .7, y + s * .4, s * .45, s * .45, 12).concat([[x - s * .25, y + s * .4]]), ellipse(x + s * .7, y + s * .4, s * .45, s * .45, 12).concat([[x + s * 1.15, y + s * .4]]), [[x - s * .7, y + s * .4], [x - s * .1, y - s * .3], [x + s * .5, y - s * .3], [x + s * .7, y + s * .4]], [[x - s * .1, y - s * .3], [x, y + s * .4], [x + s * .5, y - s * .3]]);
    if (m.icon === 'cake') P.push([[x - s, y], [x + s, y], [x + s, y + s * .9], [x - s, y + s * .9], [x - s, y]], [[x, y], [x, y - s * .6]], [[x - s * .12, y - s * .75], [x, y - s * 1.0], [x + s * .1, y - s * .72]]);
    if (m.icon === 'star') { const Q = []; for (let i = 0; i <= 10; i++) { const aa = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? s * .45 : s; Q.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); } P.push(Q); }
    if (m.icon === 'house') P.push([[x - s, y + s], [x - s, y - s * .1], [x, y - s], [x + s, y - s * .1], [x + s, y + s], [x - s, y + s]], [[x - s * .25, y + s], [x - s * .25, y + s * .4], [x + s * .2, y + s * .4], [x + s * .2, y + s]]);
    if (m.icon === 'heart') { const Q = []; for (let i = 0; i <= 24; i++) { const tt = i / 24 * TAU; Q.push([x + s * .065 * 16 * Math.pow(Math.sin(tt), 3), y - s * .065 * (13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt))]); } P.push(Q); }
    inkGroup(P, m.t - .15, .45, { w: 2.6, seed: m.seed, bright: .5, smooth: false });
  } else {
    const R = rng(m.seed); for (let k = 0; k < 4; k++) dab(ruler.g, m.x + (R() - .5) * m.r, m.y + (R() - .5) * m.r, m.r * (.5 + R() * .4), R() * 3, m.col, .32, m.seed + k);
    ev(m.t, 'dab', { pan: panOf(m.x), v: .5 });
  }
  ruler.src.push({ x: m.x, y: m.y, t: m.t, v: 380, r0: 8, R: m.r * 1.8, seed: m.seed });
}
ev(T.bag, 'bloom', { v: .7, pan: panOf(ax(5.5)) }); ev(T.sea, 'bloom', { v: .7, pan: panOf(ax(7.5)) }); ev(T.sea + .1, 'sea', { pan: panOf(ax(7.5)) });
// the clock the brain doesn't keep
{ const cx = ax(1.6), cy = RY - 560, r = 78;
  inkGroup([ellipse(cx, cy, r, r, 22).concat([[cx + r, cy + 4]]), [[cx, cy], [cx, cy - r * .62]], [[cx, cy], [cx + r * .45, cy + r * .2]]], T.clock, .6, { w: 3, seed: 801 });
  inkGroup([[[cx - r * 1.3, cy + r * 1.1], [cx + r * 1.3, cy - r * 1.1]]], T.strike, .18, { w: 4.5, seed: 802, bright: .6 });
}

// ---------------- zone A: summer, age 5 ----------------
const A = layer(200, 600, 2900, 2200);
const GA = 1980;                                   // ground under the child
const hillA = [[600, 2080], [900, 1980], [1300, 1920], [1700, 1940], [2100, 2000], [2500, 2070], [2780, 2150]];
{ const g = A.g;
  for (let k = 0; k < 6; k++) { const R = rng(30 + k); g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(hex(k % 2 ? '#9fbcd6' : '#86a6c8'), .12); g.beginPath(); g.ellipse(1000 + k * 330 + R() * 100, 1150 + R() * 300, 520, 300, 0, 0, TAU); g.fill(); g.restore(); }
  wash(g, [...hillA, [2800, 2560], [560, 2580]], hex('#c3c96f'), { a: .6, j: 14, layers: 3, seed: 51 });
  wash(g, [[600, 2200], [1100, 2110], [1800, 2150], [2700, 2240], [2760, 2560], [560, 2570]], hex('#7f9c52'), { a: .35, j: 16, layers: 2, seed: 52 });
  const R = rng(53); for (let k = 0; k < 140; k++) { const x = 600 + R() * 2200, y = 2020 + R() * 420; dab(g, x, y + (x - 1500) * (x - 1500) * .00003, 8 + R() * 14, R() * 3, [hex('#aabf57'), hex('#7fa04a'), hex('#56793c')][(R() * 3) | 0], .35, 60 + k); }
  wash(g, ellipse(2250, 1250, 92, 92, 24), hex('#e9c46a'), { a: .7, j: 4, seed: 54 });
  wash(g, [[1960, 1320], [2090, 1210], [2130, 1360], [2000, 1460]], hex('#c9573f'), { a: .78, j: 3, seed: 55, dx: 4, dy: 3 });
  // clouds are reserves: lift the sky back to paper
  for (const [x, y, w] of [[1180, 1170, 230], [1600, 1080, 170]]) { g.save(); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(245,238,222,.85)'; g.beginPath(); pathOf(g, rough(ellipse(x, y, w, w * .32, 20), 10, x)); g.fill(); g.restore(); wash(g, ellipse(x, y + w * .14, w * .8, w * .1, 14), hex('#b7b3c9'), { a: .25, j: 5, seed: x }); }
}
fray(A, 1680, 1700, 1300, 900, 3);
A.src.push({ x: 2020, y: 1330, t: T.bloomA, v: 640, r0: 40, seed: 5 });
note('summer · age 5', 760, 1400, 62, .25, .7, { font: 'Reenie Beanie' });
inkGroup([hillA], .8, .7, { w: 3.4, seed: 101 });
{ const R = rng(102), P = []; for (let k = 0; k < 26; k++) { const x = 650 + R() * 2050, y = 2090 + R() * 280 + (x - 1500) * (x - 1500) * .00003; P.push([[x, y], [x + 3 + R() * 6, y - 18 - R() * 16]]); } inkGroup(P, 1.5, .7, { w: 2, seed: 103, quiet: true }); ev(1.5, 'pen', { d: .7, pan: -.6, b: .6 }); }
inkGroup([ellipse(2250, 1250, 88, 88, 22).concat([[2338, 1256]])], 3.2, .4, { w: 2.8, seed: 104 });
for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; inkGroup([[[2250 + Math.cos(a) * 125, 1250 + Math.sin(a) * 125], [2250 + Math.cos(a) * 165, 1250 + Math.sin(a) * 165]]], 3.6 + k * .04, .04, { w: 2.4, seed: 110 + k, quiet: true }); }
inkGroup([[[1150, 1420], [1172, 1400], [1190, 1418]], [[1210, 1460], [1228, 1445], [1245, 1460]]], 3.9, .3, { w: 2.2, seed: 120 });
for (const [x, y, w] of [[1180, 1170, 230], [1600, 1080, 170]]) inkGroup([ellipse(x, y, w, w * .32, 18).slice(9, 18)], 4.1, .4, { w: 2, seed: 130 + x, quiet: true });
// the kite (moves) and its string are drawn per frame
const kiteA = t => { const b = Math.floor(t * 12) / 12; return [2020 + 5 * Math.sin(b * 1.3), 1330 + 4 * Math.sin(b * 1.9 + 1)]; };

// ---------------- zone B: an adult's year ----------------
const GB = 2100, CAL = [4560, 1400, 300, 340];
note('a Tuesday · age 38', 4960, 1300, 56, 9.3, .6, { font: 'Reenie Beanie', align: 'right' });
inkGroup([
  [[4120, 1960], [4980, 1956]], [[4170, 1962], [4180, GB]], [[4930, 1960], [4925, GB]],          // desk
  [[4300, 1955], [4330, 1830], [4560, 1832], [4580, 1955]],                                      // laptop
  [[3300, GB + 4], [5100, GB - 2]],                                                              // floor
  [[CAL[0], CAL[1]], [CAL[0] + CAL[2], CAL[1] - 2], [CAL[0] + CAL[2] + 2, CAL[1] + CAL[3]], [CAL[0], CAL[1] + CAL[3] + 2], [CAL[0], CAL[1]]],
  [[CAL[0] + CAL[2] / 2, CAL[1] - 40], [CAL[0] + CAL[2] / 2, CAL[1]]],
], 9.35, .7, { w: 3, seed: 201, bright: .4, smooth: false });
note('Why does time feel faster', 3300, 1370, 76, T.title, .9, { weight: 600, id: 'q1' });
note('as you get older?', 3300, 1460, 76, T.title + .9, .7, { weight: 600, id: 'q2' });
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
for (let i = 0; i < T.flicks; i++) ev(T.flick0 + i * T.flickStep, 'flick', { pan: panOf(CAL[0]) });

// ---------------- zone E: the commute, then something new ----------------
const E = layer(5700, 600, 3200, 2000);
const GE = 2100, STOP = 7560;
const streetE = [[6250, GE + 2], [8350, GE - 3]];
function commute(k) {   // the routine drawing; k = the k-th morning (small differences)
  const R = rng(300 + k), j = () => (R() - .5) * 10;
  return [
    [[6250 + j(), GE + j() * .3], [8350 + j(), GE + j() * .3]],
    [[STOP + j() * .3, GE], [STOP + j() * .3, 1460]],
    [[STOP - 110 + j(), 1360 + j()], [STOP + 110 + j(), 1358 + j()], [STOP + 111 + j(), 1462 + j()], [STOP - 109 + j(), 1464 + j()], [STOP - 110 + j(), 1360 + j()]],
    [[7760 + j(), GE], [7765 + j(), 1300 + j()], [8240 + j(), 1296 + j()], [8245 + j(), GE]],
    ...[0, 1, 2].flatMap(r => [0, 1, 2].map(c => { const x = 7830 + c * 140 + j() * .4, y = 1380 + r * 220 + j() * .4; return [[x, y], [x + 70, y], [x + 70, y + 110], [x, y + 110], [x, y]]; })),
  ];
}
T.loops.forEach((t0, k) => { const next = T.loops[k + 1] ?? t0 + 1.1, d = Math.min(1.1, (next - t0) * .95); inkGroup(commute(k), t0, d, { w: 2.8, seed: 400 + k * 50, alpha: k ? .55 : 1, quiet: true, smooth: false }); ev(t0, 'pen', { d, pan: .6, b: .3, loop: k }); });
note('BUS 7:45', STOP, 1432, 54, 37.3, .4, { align: 'center', weight: 600, id: 'bus' });
['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach((d, i) => note(d, 6420, 1330 + i * 92, 64, T.loops[i] + .2, .25, { font: 'Reenie Beanie', id: 'day' + i }));
note('× 100', 6420, 1800, 100, T.hundred, .35, { weight: 600, id: 'hundred' });
// something new: a hill, a kite
const hillE = [[6250, 2070], [6600, 1950], [6900, 1910], [7200, 1990], [7350, 2080]];
inkGroup([hillE], T.step + .3, .6, { w: 3.2, seed: 501 });
const kiteE0 = [6800, 1250];
inkGroup([[[kiteE0[0] - 60, kiteE0[1] - 10], [kiteE0[0] + 70, kiteE0[1] - 120], [kiteE0[0] + 110, kiteE0[1] + 30], [kiteE0[0] - 20, kiteE0[1] + 130], [kiteE0[0] - 60, kiteE0[1] - 10]], [[kiteE0[0] - 60, kiteE0[1] - 10], [kiteE0[0] + 110, kiteE0[1] + 30]], [[kiteE0[0] + 70, kiteE0[1] - 120], [kiteE0[0] - 20, kiteE0[1] + 130]]], T.kite, .5, { w: 3, seed: 502, smooth: false });
{ const g = E.g;
  for (let k = 0; k < 7; k++) { const R = rng(40 + k); g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgba(hex(k % 2 ? '#9fbcd6' : '#86a6c8'), .13); g.beginPath(); g.ellipse(6300 + k * 330 + R() * 100, 1250 + R() * 300, 520, 320, 0, 0, TAU); g.fill(); g.restore(); }
  wash(g, [...hillE, [7320, GE], [6250, GE]], hex('#c3c96f'), { a: .62, j: 12, layers: 3, seed: 61 });
  const R = rng(62); for (let k = 0; k < 50; k++) { const x = 6300 + R() * 1000, y = 2000 + R() * 90; dab(g, x, y, 8 + R() * 12, R() * 3, [hex('#aabf57'), hex('#7fa04a')][k % 2], .35, 70 + k); }
  wash(g, [[7765, 1300], [8240, 1296], [8245, GE], [7760, GE]], hex('#d8c6a0'), { a: .5, j: 8, seed: 63, dx: 4, dy: 3 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = 7830 + c * 140, y = 1380 + r * 220; wash(g, [[x, y], [x + 70, y], [x + 70, y + 110], [x, y + 110]], hex('#98b1c8'), { a: .5, j: 3, seed: 64 + r * 3 + c, dx: 3, dy: 2 }); }
  wash(g, [[STOP - 110, 1360], [STOP + 110, 1358], [STOP + 111, 1462], [STOP - 109, 1464]], hex('#e2b04a'), { a: .7, j: 3, seed: 65, dx: 4, dy: 3 });
  wash(g, [[6250, GE], [8350, GE], [8360, GE + 220], [6240, GE + 230]], hex('#c8bfb0'), { a: .35, j: 14, seed: 66 });
  wash(g, [[kiteE0[0] - 60, kiteE0[1] - 10], [kiteE0[0] + 70, kiteE0[1] - 120], [kiteE0[0] + 110, kiteE0[1] + 30], [kiteE0[0] - 20, kiteE0[1] + 130]], hex('#c9573f'), { a: .8, j: 3, seed: 67, dx: 4, dy: 3 });
}
fray(E, 7300, 1650, 1400, 900, 4);
E.src.push({ x: kiteE0[0] + 20, y: kiteE0[1] + 10, t: T.bloomE, v: 900, r0: 40, seed: 8 });
ev(T.bloomA, 'bloom', { v: 1, pan: -.6 }); ev(T.bloomE, 'bloom', { v: 1, pan: .4 });

// end title in the top margin of the page
note('Why time feels faster as you get older.', 560, 470, 230, T.endTitle, 1.3, { weight: 600, id: 'end1' });
note('Fill the page. Do something new.', 570, 700, 150, T.endSub, .9, { id: 'end2' });

// ---------------- people ----------------
const KID = { skin: hex('#eec3a4'), top: hex('#e2b04a'), bottom: hex('#7187a6'), hair: hex('#8a5a3c'), shoe: hex('#c9573f') };
const ADULT = { skin: hex('#d9a383'), top: hex('#7187a6'), bottom: hex('#4a4f5c'), hair: hex('#2f2622'), pants: 1, torso: [.08, .086, .108], shoe: hex('#3a332e') };
const boil = t => Math.floor(t * 12);
function person(look, pose, place, t, o) {
  const prims = figure(look, pose, place, { seed: o.seed, boil: o.still ? 0 : boil(t) % 3, lw: o.lw });
  drawPrims(ctx, prims, { color: o.color ?? 0, ink: o.ink ?? 1, knock: o.knock ?? 1 });
  return prims;
}

// ---------------- camera ----------------
// keys: [t, cx, cy, z, rot]; eased between keys
const KEYS = [
  [0, 1560, 1600, .92, 0], [8.8, 1560, 1640, 1.1, 0],
  [9.0, 1560, 1640, 1.1, 0], [9.6, 4220, 1720, 1.0, .0],
  [14.85, 4180, 1730, 1.03, 0], [15.2, ax(3.1), RY - 60, 2.2, 0],
  [21.0, ax(3.1), RY - 60, 2.2, 0], [24.2, 4520, RY - 120, .228, 0],
  [27.0, 4520, RY - 120, .228, 0], [28.6, ax(2.2), RY - 200, 1.0, 0],
  [36.5, ax(9.5), RY - 200, 1.0, 0], [37.1, 7260, 1700, 1.0, 0],
  [42.5, 7260, 1700, 1.0, 0], [43.3, ax(20), RY - 200, 1.0, 0],
  [45.3, ax(44), RY - 200, 1.0, 0], [46.7, 7200, 1700, 1.0, 0],
  [51.0, 7120, 1700, 1.02, 0], [55.0, PW / 2, PH / 2, SW / PW, 0], [DUR, PW / 2, PH / 2, SW / PW * 1.01, 0],
];
const WHIPS = [[9.0, 9.6, .05], [14.85, 15.2, -.03], [36.5, 37.1, -.04]];
// some moves are eased differently: the fast pan accelerates; whips are quick
function camera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = clamp((t - a[0]) / (b[0] - a[0] || 1));
  const k = a[0] === 43.3 ? u * u : a[0] === 27 || a[0] === 21 || a[0] === 51 ? ease(u) : a[0] === 28.6 ? u : ease(u);
  const zl = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), k));
  let rot = lerp(a[4], b[4], k);
  for (const [w0, w1, r] of WHIPS) if (t > w0 && t < w1) rot += r * Math.sin(Math.PI * (t - w0) / (w1 - w0));
  return { cx: lerp(a[1], b[1], k), cy: lerp(a[2], b[2], k), z: zl, rot };
}
ev(9.0, 'whip', { pan: .5 }); ev(14.8, 'whip', { pan: -.5, v: .8 }); ev(36.5, 'whip', { pan: .5 }); ev(42.5, 'whoosh', { pan: -.2 }); ev(45.5, 'whoosh', { pan: .3, v: .4 });

// ---------------- frame ----------------
function setCam(c) { const co = Math.cos(c.rot) * c.z, si = Math.sin(c.rot) * c.z; ctx.setTransform(co, si, -si, co, SW / 2 - (c.cx * co - c.cy * si), SH / 2 - (c.cx * si + c.cy * co)); }
function view(c) { const hw = SW / 2 / c.z * 1.15, hh = SH / 2 / c.z * 1.15 + hw * Math.abs(c.rot); return [c.cx - hw - hh * Math.abs(c.rot), c.cy - hh, c.cx + hw + hh * Math.abs(c.rot), c.cy + hh]; }

window.render = t => {
  const c = camera(t), vw = view(c);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(PAPER); ctx.fillRect(0, 0, SW, SH);
  setCam(c);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(mott, 0, 0, PW, PH);
  // colour layers
  drawLayer(A, t); drawLayer(E, t); drawLayer(ruler, t);
  // static ink
  for (const it of INKS) {
    const b = it.bb; if (b[2] < vw[0] || b[0] > vw[2] || b[3] < vw[1] || b[1] > vw[3]) continue;
    const p = it.custom ? it.custom(t) : prog(t, it.t0, it.dur || 1e-3);
    if (p > 0) drawPen(ctx, it.st, p, INK, it.alpha);
  }
  // zone A: the child flies a kite
  if (t < 16 || t > 50) {
    const k = kiteA(t), kp = prog(t, 2.6, .5), b = Math.floor(t * 12) / 12;
    const tug = Math.sin(b * 2.1) * .03;
    const pose = stand({ handR: V(.1, .86 + tug, .34), elbR: V(1, -.4, 0), headYaw: 0, nod: -.3 });
    const col = ss(prog(t, reach(A, 1430, 1780), .6));
    const pr = person(KID, pose, { x: 1430, y: GA, S: 400, yaw: 2.15 }, t, { seed: 21, color: col, ink: prog(t, 1.4, 1.2), knock: Math.min(1, prog(t, 1.4, .3)) });
    if (kp > 0) {
      const h = pr.hand.R, mid = [(h[0] + k[0]) / 2 + 30, (h[1] + k[1]) / 2 + 60];
      drawPen(ctx, penStroke([h, mid, k], { w: 1.6, wob: .5, seed: 140 + (boil(t) % 3), over: 0 }), kp, INK, .85);
      const kite = [[k[0] - 60, k[1] - 10], [k[0] + 70, k[1] - 120], [k[0] + 110, k[1] + 30], [k[0] - 20, k[1] + 130], [k[0] - 60, k[1] - 10]];
      drawPen(ctx, penStroke(kite, { w: 3, wob: 1, seed: 150 + (boil(t) % 3), over: 5, smooth: false }), kp);
      drawPen(ctx, penStroke([kite[0], kite[2]], { w: 1.8, seed: 160, over: 2 }), kp, INK, .7); drawPen(ctx, penStroke([kite[1], kite[3]], { w: 1.8, seed: 161, over: 2 }), kp, INK, .7);
      const tail = [...Array(9)].map((_, i) => [k[0] - 20 - i * 34, k[1] + 130 + i * 30 + 22 * Math.sin(b * 6 + i * .9)]);
      drawPen(ctx, penStroke(tail, { w: 1.8, wob: .6, seed: 170, over: 0 }), kp, INK, .85);
      for (const i of [3, 6]) { const [x, y] = tail[i]; drawPen(ctx, penStroke([[x - 14, y - 10], [x + 14, y + 10]], { w: 2.4, seed: 180 + i, over: 0 }), kp); drawPen(ctx, penStroke([[x - 14, y + 10], [x + 14, y - 10]], { w: 2.4, seed: 190 + i, over: 0 }), kp); }
    }
  }
  // zone B: the adult and the calendar
  if (t > 8.9 && t < 16.5 || t > 50) {
    const pose = stand({ headYaw: .55, nod: -.05 + .02 * Math.sin(t * 2) });
    person(ADULT, pose, { x: 3820, y: GB, S: 560, yaw: 1.95 }, t, { seed: 31, color: 0, ink: prog(t, 9.4, .6), knock: Math.min(1, prog(t, 9.3, .2)) });
    const done = clamp(Math.floor((t - T.flick0) / T.flickStep) + 1, 0, T.flicks);
    const [cx, cy, cw, ch] = CAL;
    const page = (i, a, lift) => {
      if (a <= 0) return;
      const P = [[0, 0], [cw, 0], [cw, ch], [0, ch]].map(([x, y]) => { const yy = y * (1 - lift * 1.6), xx = x + lift * (240 + y * .2); return [cx + xx + lift * 160, cy + yy - lift * 120]; });
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(PAPER, .95); ctx.beginPath(); pathOf(ctx, P); ctx.fill();
      drawPen(ctx, penStroke([...P, P[0]], { w: 2.6, seed: 220 + i, over: 3, smooth: false }), 1);
      if (lift < .3) { ctx.save(); ctx.translate(P[0][0], P[0][1]); ctx.transform(1, 0, 0, 1 - lift * 1.6, 0, 0); handwrite(ctx, MONTHS[i % 12], cw / 2, ch * .62, 120, 1, { weight: 600, align: 'center' }); ctx.restore(); }
      ctx.restore();
    };
    if (t > 9.8) {
      page(done, prog(t, 9.8, .3), 0);
      for (let i = Math.max(0, done - 2); i < done; i++) { const u = prog(t, T.flick0 + i * T.flickStep, .32); if (u < 1) page(i, 1 - u, ss(u)); }
    }
  }
  // zone E: routine ghosts, then the person steps out
  if (t > 36 || t > 50) {
    const col = ss(prog(t, reach(E, 7000, 1800), .6));
    const loops = T.loops.filter(l => t >= l);
    loops.forEach((l0, k) => { const p = prog(t, l0, Math.min(1.1, ((T.loops[k + 1] ?? l0 + 1.1) - l0) * .95)); if (k === loops.length - 1 && t < T.step) return; person(ADULT, stand({ headYaw: -.2, nod: .12 }), { x: 7250 + (rng(k + 5)() - .5) * 10, y: GE, S: 560, yaw: 2.5 }, t, { seed: 41 + k, still: true, color: 0, ink: p, knock: 0 }); });
    if (loops.length) {
      const l0 = loops[loops.length - 1];
      let pose = stand({ headYaw: -.2, nod: .12 }), x = 7250, yaw = 2.5;
      const w = prog(t, T.step, 1.0), turn = prog(t, T.step - .3, .3);
      if (t > T.step - .3) { pose = mixPose(pose, stand({ headYaw: -.6, nod: 0 }), ss(turn)); }
      if (t > T.step) { yaw = lerp(2.5, -1.3, ss(prog(t, T.step, .35))); x = 7250 - 330 * ss(w); pose = mixPose(walk(w * TAU * 1.5), pose, ss(prog(t, T.drop, .3))); }
      if (t > T.raise - .2) { const dip = Math.sin(Math.PI * prog(t, T.raise - .2, .3)) * .02, up = ss(prog(t, T.raise + .1, .45)); pose = mixPose(pose, stand({ hipY: .52 - dip, handL: V(-.15, lerp(.5, 1.02, up), lerp(.05, .2, up)), elbL: V(-1, 0, 0), headYaw: .1, nod: -.35 * up }), ss(prog(t, T.raise - .2, .3))); yaw = lerp(yaw, -2.1, ss(prog(t, T.raise - .2, .5))); }
      const pr = person(ADULT, pose, { x, y: GE, S: 560, yaw }, t, { seed: 41 + loops.length - 1, color: col, ink: t < T.step ? prog(t, l0, .3) : 1, knock: 1 });
      // the briefcase: carried, then dropped where he stood
      const dropped = t > T.drop;
      const bx = dropped ? 7050 : pr.hand.R[0], by = dropped ? GE - 34 : pr.hand.R[1] + 40;
      const bc = [[bx - 55, by - 36], [bx + 55, by - 36], [bx + 56, by + 34], [bx - 54, by + 35], [bx - 55, by - 36]];
      ctx.fillStyle = rgba(PAPER, .95); ctx.beginPath(); pathOf(ctx, bc); ctx.fill();
      if (col > 0) wash(ctx, bc, hex('#8a5a3c'), { a: .55 * col, j: 2, seed: 71, dx: 3, dy: 2 });
      drawPen(ctx, penStroke(bc, { w: 2.6, seed: 72, over: 3, smooth: false }), t < T.step ? prog(t, l0, .3) : 1);
      drawPen(ctx, penStroke([[bx - 18, by - 36], [bx - 14, by - 54], [bx + 14, by - 54], [bx + 18, by - 36]], { w: 2.2, seed: 73, over: 1 }), t < T.step ? prog(t, l0, .3) : 1);
      if (t > T.kite) { const h = pr.hand.L, k = [kiteE0[0] + 20, kiteE0[1] + 130]; drawPen(ctx, penStroke([h, [(h[0] + k[0]) / 2 + 40, (h[1] + k[1]) / 2 + 70], k], { w: 1.6, wob: .5, seed: 75 + boil(t) % 3, over: 0 }), prog(t, T.kite + .3, .4), INK, .85);
        const b = Math.floor(t * 12) / 12, tail = [...Array(8)].map((_, i) => [k[0] - i * 30, k[1] + i * 30 + 20 * Math.sin(b * 6 + i * .9)]); drawPen(ctx, penStroke(tail, { w: 1.8, wob: .6, seed: 76, over: 0 }), prog(t, T.kite + .4, .4), INK, .85); }
    }
  }
  // handwriting on the page
  for (const n of TXT) { const p = prog(t, n.t0, n.dur); if (p > 0) handwrite(ctx, n.text, n.x, n.y, n.size, p, { font: n.o.font ?? 'Caveat', weight: n.o.weight ?? 500, align: n.o.align }); }
  // paper tooth over everything
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = toothPat; ctx.fillRect(vw[0], vw[1], vw[2] - vw[0], vw[3] - vw[1]); ctx.restore();
  // captions: handwritten in the lower margin
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const s of subs) {
    if (t < s.t0 || t > s.t1) continue;
    const fade = clamp((s.t1 - t) / .25);
    handwrite(ctx, s.text, SW / 2, SH - 52, 50, prog(t, s.t0, Math.min(.45, s.text.length * .012)), { weight: 600, align: 'center', alpha: .9 * fade });
  }
};

// every text on screen at t, for the reading-time check (captions are checked via the .srt)
window.TEXTS = t => {
  const c = camera(t), out = [], co = Math.cos(c.rot) * c.z, si = Math.sin(c.rot) * c.z;
  const S = (x, y) => [SW / 2 + (x - c.cx) * co - (y - c.cy) * si, SH / 2 + (x - c.cx) * si + (y - c.cy) * co];
  ctx.save();
  for (const n of TXT) {
    if (t < n.t0 + n.dur) continue;
    if (/^r\d+$|^age$/.test(n.id)) continue;            // ruler numbers: a scale, not reading text
    ctx.font = `${n.o.weight ?? 500} ${n.size}px ${n.o.font ?? 'Caveat'}`;
    const w = ctx.measureText(n.text).width, x0 = n.o.align === 'right' ? n.x - w : n.o.align === 'center' ? n.x - w / 2 : n.x;
    const a = S(x0, n.y - n.size * .8), b = S(x0 + w, n.y + n.size * .25);
    if (Math.abs(b[0] - a[0]) < 14) continue;            // too small to be read at this zoom: not on screen as text
    out.push({ id: n.id, text: n.text, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) });
  }
  ctx.restore();
  return out;
};

window.DUR = DUR;
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load('600 60px Caveat'); await document.fonts.load('500 60px Caveat'); await document.fonts.load('60px "Reenie Beanie"');
window.READY = true;
