// Why Time Feels Faster as You Get Older — New Yorker cartoon, ink and wash. Eight full-bleed panels, some split in two.
import { clamp, lerp, ss, TAU, n2, fbm, rgba, hex, spline, resample, ellipse, wash } from './engine.js';
import { DUR } from './timeline.js';

const W = 1920, H = 1080;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const subs = await (await fetch('subs.json')).json();

const INK = [36, 32, 28], PAPER = hex('#FBF8F1');
const GREY = hex('#9698A0'), SEA = hex('#78A0BE'), SAND = hex('#E2CCA0'), RUST = hex('#C45C32');
const SKIN = [236, 214, 190];                       // sand thinned on paper
const prog = (t, a, d) => clamp((t - a) / d);
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

// ---------- the pen ----------
// Nib line: ~1.9 px on straights, swelling to ~6.4 px in turns, flicking off at the end. Living things wobble on twos (12 fps).
let LIVE = 0, WSEED = 0, WAMP = 1.7;
function wob(P, amp) { return P.map(([x, y]) => [x + (n2(x * .013, y * .013 + WSEED * 3.7, 5) - .5) * 2 * amp, y + (n2(x * .013 + 40, y * .013 + WSEED * 3.7, 6) - .5) * 2 * amp]); }
function nib(pts, o = {}) {
  if (!pts || pts.length < 2) return;
  let P = o.smooth === false || pts.length < 3 ? pts : spline(pts, 6, o.closed);
  if (LIVE) P = wob(P, WAMP * (o.wscale ?? 1));
  P = resample(P, 2.5); const n = P.length; if (n < 2) return;
  if (o.over) { const ext = (a, b, d) => { const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / l * d, a[1] + (a[1] - b[1]) / l * d]; }; P.unshift(ext(P[0], P[1], o.over * .6)); P.push(ext(P[P.length - 1], P[P.length - 2], o.over)); }
  const m = P.length, ang = [], S = [0];
  for (let i = 0; i < m - 1; i++) ang.push(Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]));
  for (let i = 1; i < m; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = S[m - 1], k = [];
  for (let i = 0; i < m; i++) { const a = ang[Math.max(0, i - 1)], b = ang[Math.min(m - 2, i)]; let d = Math.abs(b - a); if (d > Math.PI) d = TAU - d; k.push(d / 2.5); }
  const sw = k.map((_, i) => { let s = 0, c = 0; for (let j = -5; j <= 5; j++) { const q = k[clamp(i + j, 0, m - 1)]; s += q; c++; } return clamp(s / c * (o.turn ?? 34)); });
  const w0 = o.w0 ?? 1.9, w1 = o.w1 ?? 6.4, seed = o.seed ?? 1, Lf = [], Rt = [];
  for (let i = 0; i < m; i++) {
    let w = lerp(w0, w1, sw[i]) * (.88 + .24 * n2(S[i] * .02, seed, 3));
    w *= Math.min(1, .45 + S[i] / 10);                                // nib lands
    const rem = L - S[i]; if (o.flick !== false) w *= Math.pow(Math.min(1, rem / 22), .7) * .9 + (rem < 22 ? 0 : .1);   // flicks off
    const a = ang[Math.min(m - 2, i)], nx = -Math.sin(a), ny = Math.cos(a);
    Lf.push([P[i][0] + nx * w / 2, P[i][1] + ny * w / 2]); Rt.push([P[i][0] - nx * w / 2, P[i][1] - ny * w / 2]);
  }
  ctx.fillStyle = rgba(o.col ?? INK, o.alpha ?? .95); ctx.beginPath(); ctx.moveTo(Lf[0][0], Lf[0][1]);
  for (const p of Lf) ctx.lineTo(p[0], p[1]); for (let i = Rt.length - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]); ctx.closePath(); ctx.fill();
}
const line = (a, b, o = {}) => nib([a, b], { smooth: false, over: 4, ...o });
// a box drawn as four separate strokes whose corners overlap
function box(x0, y0, x1, y1, o = {}) {
  const j = o.j ?? 4, s = o.seed ?? 1, r = i => (n2(i * 3.1, s, 9) - .5) * 2 * j;
  line([x0 - 6 + r(1), y0 + r(2)], [x1 + 8 + r(3), y0 + r(4)], { ...o, seed: s }); line([x1 + r(5), y0 - 7 + r(6)], [x1 + r(7), y1 + 6], { ...o, seed: s + 1 });
  line([x1 + 7, y1 + r(8)], [x0 - 5 + r(9), y1 + r(10)], { ...o, seed: s + 2 }); line([x0 + r(11), y1 + 8], [x0 + r(12), y0 - 6], { ...o, seed: s + 3 });
}
// pale wash with pooled edges, slipped off the line by a few px (≤ 12.8)
function wa(poly, col, o = {}) {
  let P = poly; if (LIVE) P = wob(P, WAMP);
  wash(ctx, P, col, { a: o.a ?? .42, j: o.j ?? 4, layers: o.layers ?? 3, edge: o.edge ?? .55, edgeW: 2.2, dx: o.dx ?? 7, dy: o.dy ?? 4, seed: (o.seed ?? 3) + (LIVE ? WSEED % 3 : 0) });
}
// paper knocks out what is behind (foreground objects occlude)
function knock(poly, a = .97) { let P = poly; if (LIVE) P = wob(P, WAMP); ctx.fillStyle = rgba(PAPER, a); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (const p of P) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); }
const dot = (x, y, r = 3.4) => { ctx.fillStyle = rgba(INK, .95); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
const arc = (cx, cy, rx, ry, a0, a1, n = 18) => [...Array(n + 1)].map((_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

// lettering in the drawing (recorded for the reading-time check)
let FT = [], CLIP = null;
function letter(text, x, y, size, o = {}) {
  ctx.save(); ctx.font = `${size}px 'Patrick Hand'`; ctx.textAlign = o.align ?? 'center'; ctx.fillStyle = rgba(o.col ?? INK, o.alpha ?? .92);
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); ctx.fillText(text, 0, 0); } else ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width, x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
  ctx.restore();
  const M = ctx.getTransform(), p = M.transformPoint({ x: x0, y: y - size * .75 }), q = M.transformPoint({ x: x0 + w, y: y + size * .2 });
  let b = [Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y)];
  if (CLIP && (b[0] < CLIP[0] - 1 || b[2] > CLIP[1] + 1)) b = [-1e4, -1e4, -1e4 + 1, -1e4 + 1];   // cut by the split: not readable
  if (b[2] - b[0] > 16) FT.push({ id: o.id ?? text, text, x0: b[0], y0: b[1], x1: b[2], y1: b[3] });
}

// ---------- cartoon people ----------
// o: x,y (feet), h, f (+1 faces right, -1 left, 0 front), kid, coat, legs, hair ('mop'|'bald'|'tufts2'), face {eyes:'dot'|'happy'|'wide'|'shut', brow, mouth, o:blowing}, armF/armB angles (0 = down, π/2 = forward, π = up),
// cap, hat (party), glasses, tache, tie, sit (draw no legs), shoes, shorts, ret: hands
function toon(o) {
  const h = o.h, f = o.f ?? 1, kid = o.kid, x = o.x, y = o.y, lean = (o.lean ?? 0) * h;
  const hr = kid ? .17 * h : .13 * h, sy = y - (kid ? .6 : .74) * h, hy = y - (kid ? .3 : .33) * h;
  const cx = x + lean + f * .02 * h, cy = sy - hr * .95, rx = hr * .86;
  const sh = (kid ? .1 : .085) * h, hem = (kid ? .13 : .15) * h;
  const out = {};
  // legs
  if (!o.sit) {
    const st = o.stride ?? 0;
    for (const s of [-1, 1]) {
      const hx = x + s * hem * .35, fx = x + s * .055 * h + st * s * .06 * h;
      if (o.shorts) { const P = [[hx - 9, hy - 4], [hx + 9, hy - 4], [hx + 10 + s * 2, hy + .08 * h], [hx - 10 + s * 2, hy + .08 * h]]; knock(P); wa(P, o.shorts, { seed: 31 + s, a: .5 }); nib([...P, P[0]], { smooth: false, seed: 32 + s, w0: 1.6 }); }
      if (o.seated) { const kx = hx + f * .17 * h, ky = hy + .02 * h, fx2 = kx + s * 8 + f * 6; nib([[hx, hy - 2], [kx, ky], [fx2, y - 6]], { seed: 40 + s, w0: 2.2, w1: 5, flick: false }); const sP = ellipse(fx2 + f * 10, y - 4, 17, 7.5, 14); knock(sP); wa(sP, GREY, { a: .6, seed: 45 + s }); nib([...sP, sP[0], sP[1]], { seed: 46 + s, w0: 2 }); continue; }
      nib([[hx, hy - 2], [lerp(hx, fx, .5) + s * 2, lerp(hy, y, .5)], [fx, y - 6]], { seed: 40 + s, w0: 2.2, w1: 4, flick: false });
      if (o.bare) nib(arc(fx + f * 9, y - 4, 13, 5, Math.PI, TAU + .2, 10), { seed: 44 + s, w0: 1.6 });
      else { const sP = ellipse(fx + f * 10, y - 4, 17, 7.5, 14); knock(sP); wa(sP, GREY, { a: .6, seed: 45 + s }); nib([...sP, sP[0], sP[1]], { seed: 46 + s, w0: 2 }); }
    }
  }
  // coat: narrow shoulders, wide hem
  const top = sy, nk = .04 * h;
  const coat = [[cx - nk, top - 4], [cx - sh * .8, top + 4], [cx - sh, top + .05 * h], [x - hem, hy], [x + hem * .95, hy + 3], [cx + sh, top + .05 * h], [cx + sh * .8, top + 4], [cx + nk, top - 4]];
  knock(coat); wa(coat, o.coat ?? GREY, { seed: 11, a: o.coatA ?? .5 });
  nib(coat, { seed: 12, closed: false });
  if (!kid) { nib([[cx + f * nk * .3, top + 2], [cx + f * nk * .3 + f * 4, lerp(top, hy, .7)]], { seed: 13, w0: 1.4, alpha: .6 }); dot(cx + f * nk * 1.4, lerp(top, hy, .4), 2.4); dot(cx + f * nk * 1.4, lerp(top, hy, .6), 2.4); }
  if (o.tie) { const tx = cx + f * nk * .2, T = [[tx - 6, top + 2], [tx + 6, top + 2], [tx + 4 + (o.tieFly ?? 0), top + .2 * h], [tx + (o.tieFly ?? 0) * 1.3, top + .24 * h], [tx - 4 + (o.tieFly ?? 0), top + .2 * h]]; knock(T); wa(T, RUST, { a: .6, seed: 14 }); nib([...T, T[0]], { seed: 15, w0: 1.5, smooth: false }); }
  // arms (shoulder → elbow → hand); angle measured from straight down, toward the facing side
  const arm = (side, a, bend = .35, len = (kid ? .3 : .34) * h) => {
    const s0 = [cx + side * sh * .85, top + .045 * h], dir = side === f || f === 0 ? f || side : -f;
    const ang1 = a, ang2 = a + bend * (a > 1.6 ? -1 : 1);
    const el = [s0[0] + Math.sin(ang1) * dir * len * .5, s0[1] + Math.cos(ang1) * len * .5], hd = [el[0] + Math.sin(ang2) * dir * len * .5, el[1] + Math.cos(ang2) * len * .5];
    nib([s0, el, hd], { seed: 20 + side, w0: 2.3, w1: 5, flick: false });
    nib(ellipse(hd[0], hd[1], 7, 6, 10).concat([[hd[0] + 7, hd[1] + 1]]), { seed: 22 + side, w0: 1.6 });
    return hd;
  };
  out.back = arm(-f || -1, o.armB ?? .12, o.bendB ?? .3);
  // head
  const head = arc(cx, cy, rx, hr, -Math.PI * .5 - f * .3, Math.PI * 1.62 - f * .3, 26);
  knock(ellipse(cx, cy, rx, hr, 22)); wa(ellipse(cx, cy + hr * .1, rx * .95, hr * .9, 18), SKIN, { a: .45, seed: 16, dx: 4, dy: 3 });
  nib(head, { seed: 17, turn: 22 });
  const fx = f || 0;
  // nose: a bulb on the facing side
  if (f) { const nP = [[cx + f * rx * .72, cy - hr * .25], [cx + f * (rx + hr * .42), cy - hr * .05], [cx + f * (rx + hr * .48), cy + hr * .25], [cx + f * (rx + hr * .1), cy + hr * .38], [cx + f * rx * .78, cy + hr * .28]]; knock(nP); wa(nP, o.noseCol ?? SKIN, { a: .5, seed: 18, dx: 3, dy: 2 }); nib(nP, { seed: 19, turn: 30 }); }
  else nib([[cx - 3, cy - hr * .1], [cx + hr * .12, cy + hr * .28], [cx - hr * .08, cy + hr * .32]], { seed: 19 });
  // ear
  if (f) nib(arc(cx - f * rx * .78, cy + hr * .05, hr * .14, hr * .2, f > 0 ? -1.4 : Math.PI + 1.4, f > 0 ? 1.6 : Math.PI - 1.6, 8), { seed: 23, w0: 1.6 });
  // eyes, brows, mouth
  const fc = o.face ?? {}, ex = [cx + fx * rx * .12 - (f ? 0 : hr * .3), cx + fx * rx * .52 + (f ? 0 : hr * .3)], ey = cy - hr * .14;
  for (let i = 0; i < 2; i++) {
    const e = ex[i];
    if (fc.eyes === 'happy') nib(arc(e, ey + 3, 6, 5, Math.PI, TAU, 6), { seed: 24 + i, w0: 1.8 });
    else if (fc.eyes === 'shut') line([e - 6, ey + 1], [e + 6, ey + 2], { seed: 24 + i, w0: 1.8 });
    else if (fc.eyes === 'wide') { nib(ellipse(e, ey, 6, 7, 10).concat([[e + 6, ey + 1]]), { seed: 24 + i, w0: 1.4 }); dot(e + f * 1.5, ey + 1, 2.4); }
    else dot(e, ey, 3.2);
    const b = fc.brow ?? 0, inner = (i === 1) === (f >= 0) ? 1 : -1;      // the brow end nearer the nose
    if (fc.brow !== undefined) line([e - 8, ey - 14 + (inner < 0 ? -b * 6 : b * 0)], [e + 8, ey - 14 + (inner > 0 ? -b * 6 : 0)], { seed: 26 + i, w0: 2, over: 1 });
  }
  const mx = cx + fx * rx * .42, my = cy + hr * .55;
  if (fc.o) nib(ellipse(mx + f * 6, my - 2, 6, 7, 10).concat([[mx + f * 6 + 6, my - 1]]), { seed: 28, w0: 1.8 });
  else { const mo = fc.mouth ?? 0; nib([[mx - 11, my - mo * 3], [mx, my + mo * 6], [mx + 11, my - mo * 3]], { seed: 28, w0: 1.8, w1: 3.4 }); }
  if (o.tache) { const T = [[mx - 18, my - 8], [mx, my - 13], [mx + 18, my - 8], [mx, my - 3]]; knock(T); wa(T, GREY, { a: .6, seed: 29 }); nib([...T, T[0]], { seed: 30, w0: 1.6 }); }
  if (o.glasses) { for (const e of ex) nib(ellipse(e, ey, 11, 10, 12).concat([[e + 11, ey + 1]]), { seed: 33, w0: 1.6 }); line([ex[0] + 11, ey], [ex[1] - 11, ey], { seed: 34, w0: 1.4 }); }
  // hair
  if (o.hair === 'mop') { const M = []; for (let i = 0; i <= 14; i++) { const a = -Math.PI * .95 + i / 14 * Math.PI * .9; const r = hr * (1.02 + (i % 2) * .16); M.push([cx + Math.cos(a) * rx * 1.05 - f * 4, cy + Math.sin(a) * r * 1.02 - 2]); } const Mp = [...M, [cx + rx * .6, cy - hr * .45], [cx - rx * .3, cy - hr * .55]]; knock(Mp); wa(Mp, o.hairCol ?? RUST, { a: .5, seed: 35, dx: 3, dy: 2 }); nib(M, { seed: 36, turn: 40 }); }
  if (o.hair === 'bald' || o.hair === 'tufts2') { const n = o.hair === 'bald' ? 3 : 2; for (let i = 0; i < n; i++) { const a = Math.PI + f * .2 - f * (.55 + i * .22); nib([[cx + Math.cos(a) * rx * .95, cy + Math.sin(a) * hr * .95], [cx + Math.cos(a) * rx * 1.25 - f * 4, cy + Math.sin(a) * hr * 1.2 - 6]], { seed: 37 + i, w0: 1.6 }); } }
  if (o.cap) { const C = [[cx - rx * 1.05, cy - hr * .45], [cx - rx * .9, cy - hr * 1.15], [cx + rx * .9, cy - hr * 1.2], [cx + rx * 1.05, cy - hr * .5]]; knock(C); wa(C, GREY, { a: .7, seed: 41 }); nib([...C, C[0]], { smooth: false, seed: 42 }); line([cx - rx * 1.05, cy - hr * .45], [cx + f * rx * 1.6, cy - hr * .4], { seed: 43, w0: 3 }); }
  if (o.party) { const P = [[cx - rx * .55, cy - hr * .82], [cx + f * rx * .15 - 10, cy - hr * 2.05], [cx + rx * .55, cy - hr * .86]]; knock(P); wa(P, RUST, { a: .55, seed: 47 }); nib([...P, P[0]], { smooth: false, seed: 48 }); nib(ellipse(P[1][0], P[1][1] - 6, 8, 8, 10).concat([[P[1][0] + 8, P[1][1] - 5]]), { seed: 49, w0: 1.6 }); }
  if (o.hat) { const P = [[cx - rx * 1.4, cy - hr * .55], [cx - rx * .85, cy - hr * .6], [cx - rx * .75, cy - hr * 1.35], [cx + rx * .8, cy - hr * 1.38], [cx + rx * .85, cy - hr * .62], [cx + rx * 1.45, cy - hr * .58]]; knock([...P, [cx + rx * 1.4, cy - hr * .48], [cx - rx * 1.35, cy - hr * .46]]); wa(P.slice(1, 5), GREY, { a: .7, seed: 50 }); nib(P, { smooth: false, seed: 51 }); }
  out.front = arm(f || 1, o.armF ?? .12, o.bendF ?? .3);
  out.head = [cx, cy, hr];
  return out;
}

// ---------- props ----------
function kite(kx, ky, s = 1, hand) {
  const K = [[kx, ky - 70 * s], [kx + 52 * s, ky], [kx, ky + 90 * s], [kx - 52 * s, ky]];
  knock(K); wa(K, RUST, { a: .6, seed: 61 }); nib([...K, K[0]], { smooth: false, seed: 62, over: 4 });
  line(K[0], K[2], { seed: 63, w0: 1.3 }); line(K[1], K[3], { seed: 64, w0: 1.3 });
  const tail = [...Array(9)].map((_, i) => [kx - 6 * i * s, ky + 90 * s + i * 28 * s + Math.sin(WSEED * .9 + i) * 10 * s]);
  nib(tail, { seed: 65, w0: 1.5 });
  for (const i of [3, 6]) { const [x, y] = tail[i]; nib([[x - 12, y - 8], [x, y], [x - 12, y + 8]], { seed: 66 + i, w0: 1.6, smooth: false }); nib([[x + 12, y - 8], [x, y], [x + 12, y + 8]], { seed: 70 + i, w0: 1.6, smooth: false }); }
  if (hand) nib([hand, [lerp(hand[0], kx, .55) + 20, lerp(hand[1], K[2][1], .5) + 40], K[2]], { seed: 75, w0: 1.2, w1: 2, flick: false });
}
function sea(y0, y1, x0 = -40, x1 = W + 40) {
  wa([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], SEA, { a: .38, j: 8, seed: 81 });
  line([x0, y0], [x1, y0 + 3], { seed: 82, over: 0 });
  for (let i = 0; i < 9; i++) { const x = x0 + 120 + i * (x1 - x0 - 200) / 9 + (i % 3) * 30, y = lerp(y0, y1, .3 + (i % 3) * .2); nib([[x, y], [x + 18, y - 6], [x + 36, y]], { seed: 83 + i, w0: 1.4, w1: 3 }); }
  nib([[x0, y1], [x0 + 300, y1 + 8], [x0 + 700, y1 - 4], [x0 + 1100, y1 + 10], [x1, y1 - 2]], { seed: 95, over: 0 });
}
function sand(y0, x0 = -40, x1 = W + 40) { wa([[x0, y0], [x1, y0], [x1, H + 40], [x0, H + 40]], SAND, { a: .4, j: 10, seed: 96 }); }
function gulls(pts) { for (const [x, y, s] of pts) { LIVE = 1; nib([[x - 22 * s, y + 4 * s], [x - 9 * s, y - 7 * s], [x, y]], { seed: 101, w0: 1.4, w1: 3.4 }); nib([[x, y], [x + 9 * s, y - 7 * s], [x + 22 * s, y + 4 * s]], { seed: 102, w0: 1.4, w1: 3.4 }); LIVE = 0; } }
function table(x0, x1, y, drop = 400, col = SAND) {
  const T = [[x0, y], [x1, y], [x1 + 4, y + drop], [x0 - 4, y + drop]]; knock(T); wa(T, col, { a: .35, seed: 111 });
  line([x0 - 10, y], [x1 + 10, y + 2], { seed: 112 }); line([x0, y], [x0 - 4, y + drop], { seed: 113 }); line([x1, y], [x1 + 4, y + drop], { seed: 114 });
  for (let i = 0; i < 6; i++) nib([[lerp(x0, x1, i / 6) + 30, y + 30], [lerp(x0, x1, i / 6) + 34, y + drop]], { seed: 115 + i, w0: 1.1, alpha: .35 });
}
function cake(cx, cy, rx, ry, hgt, cuts, missing = 0) {
  const side = [...arc(cx, cy, rx, ry, 0, Math.PI, 20), [cx - rx, cy - hgt]].concat(arc(cx, cy - hgt, rx, ry, Math.PI, 0, 20).slice(1));
  knock([...arc(cx, cy, rx, ry, 0, Math.PI, 20), ...arc(cx, cy - hgt, rx, ry, Math.PI, TAU, 20)]);
  wa([...arc(cx, cy, rx, ry, 0, Math.PI, 20), ...arc(cx, cy - hgt, rx, ry, Math.PI, 0, 20)], SAND, { a: .55, seed: 121 });
  nib(arc(cx, cy - hgt, rx, ry, 0, TAU, 40), { seed: 122, turn: 20 });
  line([cx - rx, cy - hgt], [cx - rx, cy], { seed: 123 }); line([cx + rx, cy - hgt], [cx + rx, cy], { seed: 124 });
  nib(arc(cx, cy, rx, ry, 0, Math.PI, 20), { seed: 125, turn: 20 });
  // icing drips
  nib([...Array(16)].map((_, i) => { const a = i / 15 * Math.PI; return [cx + Math.cos(a) * rx, cy - hgt + Math.sin(a) * ry + (i % 2 ? 16 : 4)]; }), { seed: 126, w0: 1.4 });
  for (let i = 0; i < cuts; i++) { if (i < missing) continue; const a = -Math.PI / 2 + i / cuts * TAU; line([cx, cy - hgt], [cx + Math.cos(a) * rx * .97, cy - hgt + Math.sin(a) * ry * .97], { seed: 130 + i, w0: cuts > 20 ? 1 : 1.6, over: 0 }); }
}
function frame(x0, y0, x1, y1, seed) {
  knock([[x0 - 14, y0 - 14], [x1 + 14, y0 - 14], [x1 + 14, y1 + 14], [x0 - 14, y1 + 14]]);
  wa([[x0 - 14, y0 - 14], [x1 + 14, y0 - 14], [x1 + 14, y1 + 14], [x0 - 14, y1 + 14]], SAND, { a: .5, seed, j: 2 });
  box(x0 - 14, y0 - 14, x1 + 14, y1 + 14, { seed }); box(x0, y0, x1, y1, { seed: seed + 5, w0: 1.4 });
}
function museumRoom(sign, x1 = W + 40) {
  wa([[-40, 120], [x1, 120], [x1, 830], [-40, 830]], SAND, { a: .18, j: 12, seed: 141, edge: .2 });
  line([-40, 120], [x1, 122], { seed: 142 }); line([-40, 830], [x1, 832], { seed: 143 }); line([-40, 862], [x1, 865], { seed: 144 });
  wa([[-40, 865], [x1, 865], [x1, H + 40], [-40, H + 40]], GREY, { a: .25, j: 10, seed: 145 });
  for (let x = 140; x < x1; x += 260) nib([[x, 870], [x - 60, H + 30]], { seed: 146 + x, w0: 1, alpha: .4 });
  letter(sign, 80, 100, 44, { align: 'left', id: 'sign:' + sign });
}

// ---------- panels ----------
const BEACH = (t, o = {}) => {
  sea(470, 610); sand(610);
  nib(ellipse(1560, 190, 46, 46, 22).concat([[1606, 192]]), { seed: 151 }); wa(ellipse(1560, 190, 46, 46, 18), RUST, { a: .3, seed: 152 });
  nib(arc(300, 200, 120, 34, Math.PI, TAU, 14), { seed: 153, w0: 1.4 }); nib(arc(420, 190, 80, 40, Math.PI * 1.1, TAU, 10), { seed: 154, w0: 1.4 });
  if (o.castle !== false) {
    const cx = 330, cy = 900, C = [[cx - 90, cy], [cx - 90, cy - 70], [cx - 60, cy - 70], [cx - 60, cy - 90], [cx - 35, cy - 90], [cx - 35, cy - 70], [cx + 35, cy - 70], [cx + 35, cy - 130], [cx + 70, cy - 130], [cx + 70, cy - 70], [cx + 90, cy - 70], [cx + 90, cy]];
    knock(C); wa(C, SAND, { a: .6, seed: 155 }); nib(C, { smooth: false, seed: 156 });
    line([cx + 52, cy - 130], [cx + 52, cy - 185], { seed: 157, w0: 1.5 }); const Fl = [[cx + 52, cy - 185], [cx + 92, cy - 172], [cx + 52, cy - 160]]; wa(Fl, RUST, { a: .6, seed: 158 }); nib([...Fl, Fl[0]], { smooth: false, seed: 159, w0: 1.6 });
    const B = [[cx + 130, cy - 50], [cx + 190, cy - 50], [cx + 180, cy + 4], [cx + 140, cy + 4]]; knock(B); wa(B, SEA, { a: .55, seed: 160 }); nib([...B, B[0]], { smooth: false, seed: 161 }); nib(arc(cx + 160, cy - 50, 30, 30, Math.PI, TAU, 8), { seed: 162, w0: 1.4 });
  }
  if (o.umbrella !== false) {
    const ux = 1560, uy = 560; line([ux + 30, 910], [ux - 4, uy], { seed: 171 });
    const can = arc(ux, uy + 50, 190, 120, Math.PI, TAU, 24);
    for (let i = 0; i < 6; i++) { const a0 = Math.PI + i / 6 * Math.PI, a1 = Math.PI + (i + 1) / 6 * Math.PI; const P = [[ux, uy - 70], ...arc(ux, uy + 50, 190, 120, a0, a1, 4)]; wa(P, i % 2 ? RUST : SAND, { a: i % 2 ? .45 : .5, seed: 172 + i }); }
    nib([...can, ...[...Array(6)].flatMap((_, i) => arc(ux - 190 + i * 63 + 31.5, uy + 50, 31.5, 14, Math.PI, 0, 6)), can[0]], { seed: 180, over: 0 });
    for (let i = 1; i < 6; i++) { const a = Math.PI + i / 6 * Math.PI; nib([[ux, uy - 70], [ux + Math.cos(a) * 190, uy + 50 + Math.sin(a) * 120 + 2]], { seed: 181 + i, w0: 1.2 }); }
    const Tw = [[1380, 960], [1720, 950], [1780, 1010], [1420, 1024]]; wa(Tw, SEA, { a: .35, seed: 190 }); nib([...Tw, Tw[0]], { smooth: false, seed: 191 });
  }
};
function dog(x, y) {
  LIVE = 1;
  const B = [[x - 110, y], [x - 100, y - 48], [x + 40, y - 54], [x + 90, y - 30], [x + 96, y + 2]]; knock(B); wa(B, GREY, { a: .55, seed: 201 }); nib(B, { seed: 202 });
  const Hd = ellipse(x + 112, y - 30, 38, 28, 16); knock(Hd); wa(Hd, GREY, { a: .55, seed: 203 }); nib([...Hd, Hd[0], Hd[1]], { seed: 204 });
  const E = [[x + 96, y - 52], [x + 80, y - 20], [x + 92, y + 6], [x + 104, y - 30]]; knock(E); wa(E, GREY, { a: .5, seed: 205 }); nib(E, { seed: 206 });
  line([x + 112, y - 34], [x + 126, y - 33], { seed: 207, w0: 1.8 }); dot(x + 150, y - 30, 4.5);
  nib([[x - 110, y - 20], [x - 150, y - 34], [x - 168, y - 26]], { seed: 208, w0: 2 });
  nib([[x - 60, y + 2], [x - 40, y + 8]], { seed: 209 }); nib([[x + 40, y + 2], [x + 64, y + 8]], { seed: 210 });
  LIVE = 0;
}

function P1(t) {   // the beach at five
  BEACH(t);
  ctx.save(); ctx.translate(560, 960); ctx.scale(1.4, 1.4); ctx.translate(-560, -960); dog(560, 960); ctx.restore();
  LIVE = 1; for (let i = 0; i < 5; i++) nib(ellipse(120 + i * 110, 1000 - i * 18, 10, 5, 10).concat([[130 + i * 110, 1000 - i * 18]]), { seed: 220 + i, w0: 1.2, alpha: .5 }); LIVE = 0;
  LIVE = 1;
  const k = toon({ x: 980, y: 990, h: 470, f: 1, kid: 1, coat: SEA, shorts: SAND, hair: 'mop', bare: 1, face: { eyes: 'happy', mouth: 1, brow: .2 }, armF: 2.55, bendF: .2, armB: .35 });
  kite(1300, 300 + Math.sin(WSEED * .7) * 6, 1, k.front);
  LIVE = 0;
  gulls([[1100, 170, 1], [1180, 210, .8]]);
}
function birthday(n, blown) {
  wa([[-520, -40], [1480, -40], [1480, 700], [-520, 700]], SAND, { a: .15, j: 10, seed: 301, edge: .2 });
  line([-520, 380], [1480, 382], { seed: 302 }); frame(120, 120, 300, 280, 303); wa([[140, 200], [280, 180], [280, 260], [140, 260]], SEA, { a: .3, seed: 304 });
  LIVE = 1;
  toon({ x: 360, y: 980, h: 640, f: 1, coat: GREY, hair: n === 38 ? 'bald' : 'tufts2', party: 1, face: { o: !blown, eyes: blown ? 'dot' : 'shut', brow: .6, mouth: blown ? -.4 : 0 }, armF: .7, bendF: .9, armB: .3, sit: 1 });
  LIVE = 0;
  table(-540, 1500, 720, 400);
  cake(650, 760, 120, 28, 70, 0);
  letter(String(n), 650, 675, 84, { id: 'cake' + n });
  LIVE = 1;
  for (const dx of [-14, 18]) { line([650 + dx, 612], [650 + dx, 596], { seed: 310 + dx, w0: 1.4 });
    if (!blown) { const fl = [[650 + dx, 560], [650 + dx + 9, 584], [650 + dx, 596], [650 + dx - 8, 584]].map(([x, y]) => [x + (596 - y) * .5, y]); wa(fl, RUST, { a: .6, seed: 312 }); nib([...fl, fl[0]], { seed: 313, w0: 1.3 }); }
    else nib([[650 + dx, 592], [650 + dx + 10, 570], [650 + dx - 4, 548], [650 + dx + 8, 520]], { seed: 314 + dx, w0: 1.2, alpha: .5 }); }
  LIVE = 0;
}
function slices(old) {
  wa([[-520, -40], [1480, -40], [1480, 760], [-520, 760]], old ? GREY : SEA, { a: .14, j: 10, seed: 401, edge: .2 });
  line([-520, 420], [1480, 422], { seed: 402 });
  if (!old) { frame(640, 150, 820, 300, 403); wa([[660, 260], [700, 200], [740, 250], [800, 220], [800, 290], [660, 290]], SAND, { a: .4, seed: 404 }); }
  else { nib(ellipse(760, 230, 70, 70, 20).concat([[830, 232]]), { seed: 405 }); line([760, 230], [760, 185], { seed: 406 }); line([760, 230], [790, 245], { seed: 407 }); }
  LIVE = 1;
  let p;
  if (!old) p = toon({ x: 230, y: 1010, h: 620, f: 1, kid: 1, coat: RUST, coatA: .4, hair: 'mop', hairCol: SAND, face: { eyes: 'wide', mouth: 1.2, brow: -.2 }, armF: .8, bendF: .8, armB: .2, sit: 1 });
  else p = toon({ x: 240, y: 1010, h: 680, f: 1, coat: GREY, hair: 'bald', glasses: 1, tache: 1, face: { eyes: 'dot', mouth: -.2, brow: .9 }, armF: 2.6, bendF: 1.6, armB: .2, sit: 1 });
  LIVE = 0;
  table(-540, 1500, 790, 400);
  cake(720, 830, 170, 40, 80, old ? 50 : 5, old ? 1 : 1);
  letter(old ? '50' : '5', 720, 745, 60, { id: old ? 'c50' : 'c5' });
  if (!old) {   // a fifth of the cake, on a plate
    ctx.save(); ctx.translate(-60, 0); nib(ellipse(470, 840, 90, 18, 18).concat([[560, 842]]), { seed: 410 }); const S = [[420, 828], [540, 812], [500, 760], [400, 790]]; knock([...S, [400, 830]]); wa([[400, 790], [500, 760], [540, 812], [540, 836], [420, 850], [400, 828]], SAND, { a: .6, seed: 411 }); nib([[400, 828], [400, 790], [500, 760], [540, 812], [540, 836]], { smooth: false, seed: 412 }); nib([[400, 790], [540, 812]], { seed: 413, w0: 1.3 }); nib([[400, 828], [540, 836]], { seed: 414, w0: 1.3 }); ctx.restore();
  } else {      // one fiftieth, on a fork
    LIVE = 1; const hd = p.front; line([hd[0] - 4, hd[1]], [hd[0] + 70, hd[1] - 40], { seed: 420, w0: 1.6 }); for (let i = 0; i < 3; i++) line([hd[0] + 70 + i * 4, hd[1] - 40], [hd[0] + 92 + i * 4, hd[1] - 56], { seed: 421 + i, w0: 1.2 });
    const sl = [[hd[0] + 84, hd[1] - 62], [hd[0] + 108, hd[1] - 74], [hd[0] + 100, hd[1] - 54]]; wa(sl, SAND, { a: .7, seed: 425 }); nib([...sl, sl[0]], { smooth: false, seed: 426, w0: 1.2 }); LIVE = 0;
    nib(ellipse(420, 850, 80, 16, 18).concat([[500, 852]]), { seed: 427 });
  }
}
function museum(t, wing) {
  if (wing === 'young') {
    museumRoom('Ages 5–12');
    const F = [[110, 250, 430, 520, 'First day at school'], [540, 220, 920, 540, 'The sea'], [1040, 290, 1270, 500, 'My bike'], [1380, 250, 1660, 520, "Grandma's kitchen"]];
    F.forEach(([x0, y0, x1, y1, lab], i) => { frame(x0, y0, x1, y1, 500 + i * 10); letter(lab, (x0 + x1) / 2, y1 + 60, 30, { id: 'lab' + i }); });
    // inside the frames
    ctx.save(); ctx.translate(-40, 0);
    wa([[160, 420], [460, 420], [460, 512], [160, 512]], SAND, { a: .4, seed: 541 }); box(220, 330, 330, 420, { seed: 542, w0: 1.4 }); line([200, 335], [350, 300], { seed: 543 }); line([350, 300], [350, 335], { seed: 544 });
    LIVE = 0; toon({ x: 400, y: 505, h: 130, f: -1, kid: 1, coat: SEA, hair: 'mop', face: { eyes: 'wide', mouth: -.3, brow: .6 }, armB: .3, armF: .2 }); const sat = [[396, 446], [432, 444], [430, 476], [398, 478]]; wa(sat, RUST, { a: .6, seed: 545 }); nib([...sat, sat[0]], { smooth: false, seed: 546, w0: 1.3 });
    ctx.restore();
    ctx.save(); ctx.translate(-80, 0);
    wa([[630, 380], [990, 380], [990, 530], [630, 530]], SEA, { a: .5, seed: 547 }); line([630, 380], [990, 382], { seed: 548 }); for (let i = 0; i < 5; i++) nib([[660 + i * 70, 430 + (i % 2) * 40], [680 + i * 70, 420 + (i % 2) * 40], [700 + i * 70, 430 + (i % 2) * 40]], { seed: 549 + i, w0: 1.3, w1: 3 }); nib(ellipse(900, 290, 30, 30, 14).concat([[930, 291]]), { seed: 555 }); wa(ellipse(900, 290, 30, 30, 12), RUST, { a: .3, seed: 556 });
    ctx.restore();
    ctx.save(); ctx.translate(-110, 0);
    for (const cx of [1205, 1325]) nib(ellipse(cx, 440, 40, 40, 16).concat([[cx + 40, 441]]), { seed: 557 + cx, w0: 1.6 }); nib([[1205, 440], [1250, 380], [1300, 380], [1325, 440]], { smooth: false, seed: 560 }); nib([[1250, 380], [1265, 440], [1300, 380]], { smooth: false, seed: 561 }); wa([[1250, 380], [1300, 380], [1325, 440], [1205, 440]], RUST, { a: .4, seed: 562 });
    ctx.restore();
    ctx.save(); ctx.translate(-120, 0);
    box(1560, 330, 1760, 500, { seed: 563, w0: 1.3 }); for (const [x, c] of [[1600, RUST], [1680, SEA]]) { const P = ellipse(x, 395, 32, 22, 12); wa(P, c, { a: .5, seed: 564 + x }); nib([...P, P[0]], { seed: 565 + x, w0: 1.4 }); }
    ctx.restore();
    // where a clock would hang
    wa(ellipse(980, 690, 52, 52, 20), GREY, { a: .22, seed: 570, edge: .8 }); dot(980, 632, 3); letter('No clocks', 980, 790, 30, { id: 'noclock' });
    LIVE = 1;
    const gesture = ss(prog(t, 30.4, .5)) - ss(prog(t, 33.4, .5));
    toon({ x: 1800, y: 1000, h: 520, f: -1, coat: GREY, coatA: .62, cap: 1, tache: 1, hair: 'tufts2', face: { eyes: 'dot', mouth: .5, brow: -.3 }, armF: lerp(.3, 2.2, gesture), bendF: lerp(.3, .1, gesture), armB: .3 });
    LIVE = 0;
  } else {
    const fill = wing === 'filling';
    museumRoom('Ages 30–45');
    frame(1760, 380, 1830, 440, 600); line([1772, 425], [1818, 425], { seed: 601, w0: 1.2 }); line([1806, 425], [1806, 395], { seed: 602, w0: 1.2 }); letter('Bus stop', 1795, 480, 22, { id: 'busstop' });
    for (const x of [300, 640, 980, 1560]) { dot(x, 210, 2.5); if (!fill) wa([[x - 110, 230], [x + 110, 230], [x + 110, 420], [x - 110, 420]], PAPER, { a: .5, seed: x, edge: .9 }); }
    if (fill) {
      const F = [[190, 230, 410, 420, 'Pottery'], [530, 230, 750, 420, 'Lisbon'], [1450, 230, 1670, 420, 'The cello']];
      F.forEach(([x0, y0, x1, y1, lab], i) => { frame(x0, y0, x1, y1, 610 + i * 10); letter(lab, (x0 + x1) / 2, y1 + 56, 30, { id: 'nl' + i }); });
      const P = [[240, 400], [260, 300], [300, 280], [340, 300], [360, 400]]; wa(P, RUST, { a: .5, seed: 640 }); nib(P, { seed: 641 });
      box(570, 300, 710, 380, { seed: 642, w0: 1.4 }); wa([[570, 300], [710, 300], [710, 380], [570, 380]], SAND, { a: .6, seed: 643 }); for (const cx of [600, 680]) nib(ellipse(cx, 388, 12, 12, 10).concat([[cx + 12, 389]]), { seed: 644 + cx, w0: 1.4 }); line([640, 300], [660, 250], { seed: 646, w0: 1.2 });
      const C = [[1560, 250], [1590, 300], [1580, 340], [1600, 400], [1520, 400], [1540, 340], [1530, 300]]; wa(C, RUST, { a: .5, seed: 647 }); nib([...C, C[0]], { seed: 648 }); line([1560, 400], [1560, 250], { seed: 649, w0: 1.2 });
      // the ladder, the guard, the new picture
      const lx = 900; line([lx - 80, 1000], [lx - 30, 640], { seed: 650 }); line([lx + 80, 1000], [lx + 30, 640], { seed: 651 }); for (let i = 1; i < 5; i++) line([lx - 80 + i * 10, 1000 - i * 72], [lx + 80 - i * 10, 1000 - i * 72], { seed: 652 + i, w0: 1.6 });
      LIVE = 1;
      const g = toon({ x: lx, y: 712, h: 520, f: 1, coat: GREY, coatA: .62, cap: 1, tache: 1, hair: 'tufts2', face: { eyes: 'happy', mouth: .9, brow: .2 }, armF: 2.0, bendF: .25, armB: .4 });
      const fx0 = g.front[0] + 6, fy0 = g.front[1] - 110;
      LIVE = 0;
      frame(fx0, fy0, fx0 + 250, fy0 + 190, 660); wa([[fx0, fy0 + 120], [fx0 + 250, fy0 + 120], [fx0 + 250, fy0 + 190], [fx0, fy0 + 190]], SEA, { a: .5, seed: 661 });
      const kx = fx0 + 170, ky = fy0 + 60, K = [[kx, ky - 30], [kx + 22, ky], [kx, ky + 38], [kx - 22, ky]]; wa(K, RUST, { a: .6, seed: 662 }); nib([...K, K[0]], { smooth: false, seed: 663, w0: 1.4 });
      toon({ x: fx0 + 80, y: fy0 + 150, h: 80, f: 1, coat: GREY, hair: 'bald', face: { eyes: 'happy', mouth: 1 }, armF: 2.6, armB: .3, bare: 1 });
      letter('The kite', fx0 + 125, fy0 + 245, 30, { id: 'kitelab' });
    } else {
      LIVE = 1;
      const ch = [[430, 1000], [430, 850], [660, 850], [660, 1000]]; line([400, 700], [430, 1000], { seed: 683 }); line([400, 700], [440, 850], { seed: 684 });
      toon({ x: 520, y: 1000, h: 520, f: 1, seated: 1, coat: GREY, coatA: .62, cap: 1, tache: 1, hair: 'tufts2', lean: -.04, face: { eyes: 'shut', mouth: -.1, brow: .1 }, armF: .5, bendF: .6, armB: .25 });
      const zt = WSEED % 24 / 24; for (let i = 0; i < 3; i++) letter('z', 620 + i * 40 + zt * 20, 560 - i * 46 - zt * 30, 34 + i * 8, { id: 'z' + i, alpha: .8 });
      LIVE = 0;
      line([430, 850], [430, 1000], { seed: 680 }); line([660, 850], [660, 1000], { seed: 681 }); line([410, 852], [680, 850], { seed: 682 });
    }
  }
}
function queue(t, stepped) {
  const VP = [80, 520];
  wa([[-40, -40], [W + 40, -40], [W + 40, 560], [-40, 560]], GREY, { a: .1, j: 12, seed: 701, edge: .2 });
  for (let i = 0; i < 6; i++) { const x0 = 200 + i * 300, w = 220 + (i % 2) * 60, top = 140 + (i % 3) * 60; box(x0, top, x0 + w, 560, { seed: 710 + i * 7 }); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) box(x0 + 40 + c * (w / 2 - 20), top + 40 + r * 110, x0 + 40 + c * (w / 2 - 20) + 44, top + 100 + r * 110, { seed: 740 + i * 13 + r * 3 + c, w0: 1.2, j: 2 }); wa([[x0, top], [x0 + w, top], [x0 + w, 560], [x0, 560]], i % 2 ? GREY : SAND, { a: .3, seed: 760 + i }); }
  wa([[-40, 560], [W + 40, 560], [W + 40, 900], [-40, 900]], SAND, { a: .35, j: 10, seed: 770 });
  line([-40, 560], [W + 40, 562], { seed: 771 }); line([-40, 905], [W + 40, 900], { seed: 772 });
  wa([[-40, 905], [W + 40, 900], [W + 40, H + 40], [-40, H + 40]], GREY, { a: .3, seed: 773 });
  // the stop
  line([1700, 920], [1700, 400], { seed: 780 }); knock([[1625, 300], [1775, 300], [1775, 400], [1625, 400]]); wa([[1625, 300], [1775, 300], [1775, 400], [1625, 400]], RUST, { a: .45, seed: 781 }); box(1625, 300, 1775, 400, { seed: 782 });
  letter('BUS 7:45', 1700, 362, 40, { id: 'bus' });
  // a hundred mornings, one man
  const N = 14; LIVE = 1; const seed0 = WSEED;
  for (let k = N - 1; k >= 0; k--) {
    if (stepped && k === 0) continue;
    const s = Math.pow(.83, k), x = lerp(VP[0], 1540, s), y = lerp(VP[1] + 30, 900, s);
    WSEED = seed0; WAMP = 1.7 * Math.max(.4, s);
    const p = toon({ x, y, h: 560 * s, f: 1, coat: GREY, coatA: .55, hair: 'bald', hat: 1, face: { eyes: 'dot', mouth: -.4, brow: .5 }, armB: .1, armF: .12 });
    if (s > .2) { const b = p.front, bc = [[b[0] - 30 * s, b[1] + 6 * s], [b[0] + 34 * s, b[1] + 6 * s], [b[0] + 34 * s, b[1] + 50 * s], [b[0] - 30 * s, b[1] + 50 * s]]; knock(bc); wa(bc, RUST, { a: .4, seed: 790 }); box(bc[0][0], bc[0][1], bc[2][0], bc[2][1], { seed: 791, j: 1, w0: 1.4 }); }
  }
  if (stepped) {
    const lk = ss(prog(t, 46.9, .5));
    toon({ x: lerp(1540, 1150, ss(prog(t, 46.6, .9))), y: lerp(900, 1000, ss(prog(t, 46.6, .9))), h: lerp(560, 620, ss(prog(t, 46.6, .9))), f: -1, coat: GREY, coatA: .55, hair: 'bald', hat: 1, face: { eyes: 'wide', mouth: lerp(-.4, .6, lk), brow: lerp(.5, -.4, lk) }, armB: .1, armF: lerp(.12, .45, lk), bendF: .5 });
    const bc = [[1500, 856], [1564, 856], [1564, 900], [1500, 900]]; knock(bc); wa(bc, RUST, { a: .4, seed: 790 }); box(1500, 856, 1564, 900, { seed: 791, j: 1, w0: 1.4 });
  }
  WAMP = 1.7; LIVE = 0;
}
function beachMan(t) {
  sea(470, 610, -40, 1100); sand(610, -40, 1100);
  nib(ellipse(820, 160, 40, 40, 18).concat([[860, 161]]), { seed: 801 }); wa(ellipse(820, 160, 40, 40, 16), RUST, { a: .3, seed: 802 });
  const bc = [[180, 880], [260, 878], [262, 934], [182, 936]]; knock(bc); wa(bc, RUST, { a: .4, seed: 803 }); box(180, 880, 262, 936, { seed: 804 });
  for (const [x, y] of [[300, 930], [330, 940]]) { const P = ellipse(x, y, 20, 8, 12); wa(P, GREY, { a: .5, seed: 805 + x }); nib([...P, P[0]], { seed: 806 + x, w0: 1.6 }); }
  LIVE = 1;
  const m = toon({ x: 470, y: 960, h: 560, f: 1, coat: GREY, coatA: .5, hair: 'bald', tie: 1, tieFly: -26 + Math.sin(WSEED * .8) * 6, bare: 1, face: { eyes: 'happy', mouth: 1.3, brow: .3 }, armF: 2.6, bendF: .2, armB: .6 });
  kite(760, 260 + Math.sin(WSEED * .7) * 6, .9, m.front);
  LIVE = 0;
  gulls([[260, 200, .9]]);
}

// ---------- the film: panels, slides, splits ----------
const CUTS = [9.0, 15.0, 27.0, 36.6, 42.0, 46.5, 51.0];
function cam(z, cx, cy) { ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy); }
const PANELS = [
  (t) => { const u = ease(prog(t, 0, 9)); cam(lerp(1.0, 1.08, u), lerp(960, 930, u), lerp(540, 590, u)); P1(t); },
  (t) => split(t, 11.0, x => birthday(38, t > 10.4), x => birthday(39, t > 13.2), 0),
  (t) => split(t, 20.4, x => slices(false), x => slices(true), 0),
  (t) => { const push = ease(prog(t, 33.2, 1.8)); const u = prog(t, 27, 6); cam(lerp(1.0, 1.65, push), lerp(lerp(960, 1010, u), 810, push), lerp(540, 400, push)); museum(t, 'young'); },
  (t) => { const u = ease(prog(t, 36.6, 5.4)); cam(lerp(1.12, 1.0, u), lerp(1080, 960, u), lerp(560, 540, u)); queue(t, false); },
  (t) => { const u = ease(prog(t, 42, 4.5)); cam(1.04, lerp(900, 1100, u), 560); museum(t, 'empty'); },
  (t) => split(t, 48.0, x => queue(t, true), x => beachMan(t), 700),
  (t) => { const u = ease(prog(t, 51.2, 4.2)); cam(lerp(1.3, 1.0, u), lerp(980, 960, u), lerp(520, 540, u)); museum(t, 'filling'); },
];
// a full-bleed drawing that splits into two side by side at time ts: left keeps its subject, right slides in
function split(t, ts, left, right, shiftL) {
  const e = ease(prog(t, ts, .6)), seam = W / 2;
  const drift = 1 + .02 * prog(t, ts - 4, 10);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, lerp(W, seam - 6, e), H); ctx.clip(); CLIP = [0, lerp(W, seam - 6, e)];
  ctx.translate(shiftL ? -shiftL * e : 480 * (1 - e), 0); ctx.scale(drift, drift); left(); ctx.restore();
  if (e > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(seam + 6 + (1 - e) * seam, 0, W, H); ctx.clip(); CLIP = [seam + 6 + (1 - e) * seam, W];
    ctx.translate(seam + (1 - e) * seam, 0); ctx.scale(drift, drift); right(); ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(seam - 6 + (1 - e) * seam, 0, 12, H);
  }
  CLIP = null;
}

// paper: cold-press, fading to white at the edges
const mott = document.createElement('canvas'); mott.width = 320; mott.height = 180;
{ const g = mott.getContext('2d'), im = g.createImageData(320, 180); for (let j = 0; j < 180; j++) for (let i = 0; i < 320; i++) { const k = 1 + .03 * ((fbm(i * .05, j * .05, 3, 3) - .5) * 2); const o = (j * 320 + i) * 4; im.data[o] = PAPER[0] * k; im.data[o + 1] = PAPER[1] * k; im.data[o + 2] = PAPER[2] * k; im.data[o + 3] = 255; } g.putImageData(im, 0, 0); }
const tooth = document.createElement('canvas'); tooth.width = tooth.height = 256;
{ const g = tooth.getContext('2d'), im = g.createImageData(256, 256); let s = 9; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 256 * 256; i++) { const v = 255 - (R() < .3 ? R() * 22 : R() * 6); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v * .99; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); }
const toothPat = ctx.createPattern(tooth, 'repeat');

function drawPanel(i, t, dx) {
  ctx.save(); ctx.translate(dx, 0);
  ctx.drawImage(mott, -20, -20, W + 40, H + 40);
  PANELS[i](t);
  ctx.restore();
}
window.render = t => {
  FT = []; WSEED = Math.floor(t * 12);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(PAPER); ctx.fillRect(0, 0, W, H);
  let i = 0; while (i < CUTS.length && t >= CUTS[i]) i++;
  // the next drawing slides in and pushes the last one out (0.5 s around each cut)
  const near = CUTS.findIndex(c => t > c - .25 && t < c + .25);
  if (near >= 0) { const e = ease((t - CUTS[near] + .25) / .5); drawPanel(near, t, -W * e); drawPanel(near + 1, t, W * (1 - e)); ctx.fillStyle = '#ffffff'; ctx.fillRect(W * (1 - e) - 6, 0, 12, H); }
  else drawPanel(i, t, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // paper fades to white at the edges; tooth over everything
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .55, W / 2, H / 2, W * .62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = toothPat; ctx.fillRect(0, 0, W, H); ctx.restore();
  // the caption: one hand-lettered line under the action, letter by letter
  for (const s of subs) {
    if (t < s.t0 || t > s.t1) continue;
    const n = Math.floor(s.text.length * prog(t, s.t0, Math.min(1.6, s.text.length / 30))), a = clamp((s.t1 - t) / .2);
    ctx.save(); ctx.font = "38px 'Patrick Hand'"; ctx.textAlign = 'left'; ctx.fillStyle = rgba(INK, .92 * a);
    const w = ctx.measureText(s.text).width; ctx.fillText(s.text.slice(0, n), W / 2 - w / 2, H - 34); ctx.restore();
  }
};
window.TEXTS = t => { window.render(t); return FT; };
const EV = [];
CUTS.forEach(c => EV.push({ t: c - .25, type: 'slide' }));
for (const [t, type] of [[11.0, 'slide'], [20.4, 'slide'], [48.0, 'slide'], [10.4, 'puff'], [13.2, 'puff'], [20.6, 'clink'], [46.9, 'step'], [53.5, 'tap'], [52.2, 'creak']]) EV.push({ t, type });
for (const s of subs) EV.push({ t: s.t0, type: 'write', d: Math.min(1.6, s.text.length / 30) });
window.EV = EV.sort((a, b) => a.t - b.t);
window.DUR = DUR;
await document.fonts.load("38px 'Patrick Hand'");
window.READY = true;
