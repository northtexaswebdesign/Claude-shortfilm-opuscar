// wc.js: Autumn Transparent Watercolour on the Deadpan Style page engine.
// Shapes are laid in crisply (one clean first wash), then two or three glazes, each smaller and darker, pushed to the shadow side,
// each drying to a tide-mark edge. Blooms go inside large washes only. Sky and water are wet-in-wet; ripples are dry-brush.
// Light comes from one side (LIGHT = -1: from the left; shadows fall right).
import { hex, mix3, rgba, rough, rng, TAU, lerp, clamp, wash, ellipse } from './engine.js';

export const AU = {
  gold: hex('#ECAA34'), scarlet: hex('#E46030'), rust: hex('#B8743C'),
  mist: hex('#C2C6D2'), violet: hex('#8A8496'), sky: hex('#CFDCE8'), skyLow: hex('#E4E8EE'),
  ground: hex('#C9C79A'), groundDk: hex('#A9A878'), skin: hex('#F0CBAE'), bark: hex('#7A6656'), water: hex('#AFC0D0'),
};
export let LIGHT = -1;
export const setLight = d => { LIGHT = d; };

const centroid = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
const bbox = P => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
// shrink a polygon towards a point pushed to the shadow side
function inner(P, k, push) { const [x0, y0, x1, y1] = bbox(P), c = centroid(P), sx = c[0] - LIGHT * (x1 - x0) * push, sy = c[1] + (y1 - y0) * push * .5; return P.map(([x, y]) => [lerp(sx, x, k), lerp(sy, y, k)]); }

export function addWatercolour(pg) {
  const cx = pg.cx; let sd = 5000;
  // a crisp first wash, then n glazes, each smaller and darker, each with a tide-mark edge
  pg.glaze = (P, col, o = {}) => {
    const n = o.n ?? 2, a = o.a ?? .5, shade = o.shade ?? AU.violet;
    wash(cx, P, col, { a, j: o.j ?? 2.2, layers: 2, edge: .55, edgeW: 2.2, seed: sd++, freq: .03 });
    for (let i = 1; i <= n; i++) {
      const Q = inner(P, 1 - i * (o.step ?? .24), o.push ?? .16), c = mix3(col, shade, .25 * i);
      wash(cx, Q, c, { a: a * (.75 - i * .1), j: 3 + i * 2, layers: 2, edge: .6, edgeW: 2.0, seed: sd++, freq: .025 });
    }
  };
  // a bloom (cauliflower back-run) inside a large wash: pigment pushed out to a frilly dark ring, paler middle
  pg.bloom = (x, y, r, col) => {
    const R = rng(sd++), ring = [...Array(46)].map((_, i) => { const a = i / 46 * TAU, k = 1 + .05 * Math.sin(a * 9 + R() * 6) + .03 * (R() - .5); return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * .8]; });
    cx.save(); cx.globalCompositeOperation = 'screen'; const g = cx.createRadialGradient(x, y, r * .1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.8, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.beginPath(); ring.forEach(([a, b], i) => i ? cx.lineTo(a, b) : cx.moveTo(a, b)); cx.closePath(); cx.fill(); cx.restore();
    cx.save(); cx.globalCompositeOperation = 'multiply'; cx.strokeStyle = rgba(mix3(col, AU.violet, .3), .16); cx.filter = 'blur(1.5px)'; cx.lineWidth = 5; cx.lineJoin = 'round'; cx.beginPath(); ring.forEach(([a, b], i) => i ? cx.lineTo(a, b) : cx.moveTo(a, b)); cx.closePath(); cx.stroke(); cx.filter = 'none'; cx.restore();
  };
  // wet-in-wet: soft bands that melt into each other (sky, water, mist)
  pg.wet = (P, cols, o = {}) => {
    const [x0, y0, x1, y1] = bbox(P);
    cx.save(); cx.globalCompositeOperation = 'multiply'; cx.beginPath(); P.forEach(([a, b], i) => i ? cx.lineTo(a, b) : cx.moveTo(a, b)); cx.closePath(); cx.clip();
    cx.filter = `blur(${o.blur ?? 26}px)`;
    cols.forEach((c, i) => { const yA = lerp(y0, y1, i / cols.length) - 40, yB = lerp(y0, y1, (i + 1) / cols.length) + 40, Q = rough([[x0 - 80, yA], [x1 + 80, yA], [x1 + 80, yB], [x0 - 80, yB]], 40, sd++, 30, .006);
      cx.fillStyle = rgba(c, o.a ?? .45); cx.beginPath(); Q.forEach(([a, b], k) => k ? cx.lineTo(a, b) : cx.moveTo(a, b)); cx.closePath(); cx.fill(); });
    cx.filter = 'none'; cx.restore();
  };
  // dry-brush ripples: short broken horizontal strokes skipping over the paper tooth
  pg.ripples = (x0, y0, x1, y1, col, o = {}) => {
    const R = rng(sd++); cx.save(); cx.globalCompositeOperation = 'multiply';
    for (let k = 0; k < (o.n ?? 60); k++) { const y = lerp(y0, y1, Math.pow(R(), .8)), L = lerp(30, 160, (y - y0) / (y1 - y0 || 1)) * (.5 + R()), x = lerp(x0, x1, R());
      for (let s = 0; s < L; s += 6) { if (R() < .35) continue; cx.fillStyle = rgba(col, .25 + R() * .25); cx.fillRect(x + s, y + Math.sin(s * .05) * 1.5, 5 + R() * 3, 2 + R() * 2); } }
    cx.restore();
  };
  // autumn foliage: a pale wash, scallop-edged clusters glazed darker on the shadow side, dark dots, flicked leaves
  pg.tree = (x, gy, h, o = {}) => {
    const R = rng(sd++), cols = o.cols ?? [AU.gold, AU.scarlet, AU.rust], w = h * (o.wide ?? .55);
    pg.shape([[x - h * .03, gy], [x - h * .02, gy - h * .55], [x + h * .02, gy - h * .55], [x + h * .035, gy]], AU.bark, { a: .55 });
    pg.line([[x, gy - h * .45], [x - LIGHT * w * .3, gy - h * .7]], { w: 2 }); pg.line([[x, gy - h * .5], [x + LIGHT * w * .25, gy - h * .78]], { w: 1.8 });
    const scallop = (cx0, cy0, rx, ry) => { const P = []; const n = 9; for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; for (let s = 0; s <= 4; s++) { const a = lerp(a0, a1, s / 4), bump = 1 + .13 * Math.sin(s / 4 * Math.PI); P.push([cx0 + Math.cos(a) * rx * bump, cy0 + Math.sin(a) * ry * bump]); } } return P; };
    pg.wash(ellipse(x, gy - h * .72, w * .55, h * .3, 30), cols[0], { a: .14, j: 22, edge: .12 });
    for (let k = 0; k < (o.clusters ?? 6); k++) { const cx0 = x + (R() - .5) * w * .9, cy0 = gy - h * (.55 + R() * .38), rx = w * (.18 + R() * .12), col = cols[k % cols.length];
      pg.glaze(scallop(cx0, cy0, rx, rx * .78), col, { a: .5, n: 2, j: 2.5 }); }
    for (let k = 0; k < 26; k++) { const a = R() * TAU, rr = Math.sqrt(R()), px = x + Math.cos(a) * w * .5 * rr - LIGHT * w * .12, py = gy - h * .72 + Math.sin(a) * h * .3 * rr; cx.save(); cx.globalCompositeOperation = 'multiply'; cx.fillStyle = rgba(mix3(AU.rust, AU.violet, .5), .7); cx.beginPath(); cx.arc(px, py, 2.5 + R() * 3, 0, TAU); cx.fill(); cx.restore(); }
    for (let k = 0; k < 14; k++) { const a = R() * TAU, px = x + Math.cos(a) * w * .62, py = gy - h * .72 + Math.sin(a) * h * .36, ang = R() * TAU; wash(cx, ellipse(px, py, 11, 4.5, 10, 0).map(([X, Y]) => [px + (X - px) * Math.cos(ang) - (Y - py) * Math.sin(ang), py + (X - px) * Math.sin(ang) + (Y - py) * Math.cos(ang)]), cols[k % cols.length], { a: .7, j: 1, layers: 1, edge: .5, seed: sd++ }); }
  };
  // scrub / bushes when there are few trees: low scalloped warm clusters
  pg.scrub = (x, gy, w, col = AU.rust) => { for (let k = 0; k < 3; k++) { const c = [x + (k - 1) * w * .32, gy - w * .12], P = ellipse(c[0], c[1], w * .26, w * .16, 22); pg.glaze(P.map(([a, b], i) => [a, b + (i % 3 ? 0 : -6)]), k === 1 ? AU.gold : col, { a: .5, n: 1 }); } };
  return pg;
}

// leaves drifting past the lens (screen space, drawn last, slightly out of focus)
export function driftLeaves(ctx, t, o = {}) {
  const cols = [AU.gold, AU.scarlet, AU.rust], n = o.n ?? 3;
  for (let i = 0; i < n; i++) {
    const per = 7 + i * 2.3, ph = ((t + i * 3.1) % per) / per; if (ph > .55) continue;
    const k = ph / .55, x = lerp(-120, 2040, k) + Math.sin(t * 1.3 + i) * 60, y = lerp(-80 + i * 160, 1160 - i * 90, k) + Math.sin(t * 2.1 + i * 2) * 40, sz = 26 + i * 14, rot = t * (1.2 + i * .4) + i;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, .45 + .35 * Math.sin(t * 3 + i)); ctx.filter = `blur(${1.5 + i * 1.2}px)`; ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba(cols[i % 3], .75); ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * .45, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mix3(cols[i % 3], AU.violet, .5), .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-sz, 0); ctx.lineTo(sz * 1.2, 0); ctx.stroke(); ctx.restore();
  }
}
