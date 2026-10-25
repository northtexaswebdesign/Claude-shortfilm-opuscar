// Drawing kit for "Why Can't You Remember Being a Baby?": a page builder (static ink in stroke order + washes + colour arrival)
// and dynamic cartoon parts (faces, babies, mice, props) as engine primitives. Deadpan Style, on the Urban Sketch engine.
import { rng, n2, fbm, hex, mix3, lerp, clamp, ss, TAU, ellipse, spline, penStroke, rasterPen, wash, reserve, rough, arrivalField, INK, PAPER, rgba } from './engine.js';

export const PAL = {
  grey: hex('#9698A0'), blue: hex('#78A0BE'), sand: hex('#E2CCA0'), rust: hex('#C45C32'),
  skin: hex('#F2CDB2'), skinB: hex('#D9A383'), wall: hex('#E9DCC2'), floor: hex('#B9B4AE'), white: hex('#F4F1EA'), dark: hex('#5B5A63'),
};
export const pale = (c, k = .35) => mix3(c, [255, 255, 255], k);

function cv(w, h, fill) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); if (fill) { x.fillStyle = fill; x.fillRect(0, 0, w, h); } return [c, x]; }
export const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
export const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// ---------- Page: one scene's static drawing ----------
// Strokes without `at` draw on in the first seconds, spreading from `origin` (window A); strokes with `at` draw on at that scene time (window B).
// Wash everywhere arrives from the origin, except inside `late` regions, which colour only when their own source fires.
export function makePage(W, H, o = {}) {
  const [colorC, cx] = cv(W, H, '#fff');
  const [inkAC, ia] = cv(W, H), [timeAC, ta] = cv(W, H, '#fff'), [inkBC, ib] = cv(W, H), [timeBC, tb] = cv(W, H, '#fff');
  ta.globalCompositeOperation = 'darken'; tb.globalCompositeOperation = 'darken';
  const winA = o.winA ?? [0, 3.2], winB = [0, o.len ?? 30], origin = o.origin ?? [W / 2, H / 2], speed = o.speed ?? 1500, t0 = o.t0 ?? .15;
  const R = rng(o.seed ?? 7); let sd = (o.seed ?? 7) * 1000;
  const late = [], sources = [], strokes = [];
  const pg = { W, H, cx, R, strokes, late, sources, origin };
  pg.pen = (pts, op = {}) => {
    if (pts.length < 2) return;
    const st = penStroke(pts, { w: op.w ?? 2.5, wob: op.wob ?? .8, over: op.over ?? 6, nib: op.nib ?? 2.6, seed: op.seed ?? sd++, gap: op.gap ?? .12, smooth: op.smooth, step: op.step });
    if (op.alpha) st.alpha = op.alpha;
    if (st.P.length < 2) return;
    const du = op.dur ?? clamp(st.L / 2200, .05, .45);
    if (op.at !== undefined) { rasterPen(ib, tb, st, op.at, du, winB); strokes.push([op.at, du, Math.round(st.L)]); return; }
    const m = st.P[st.P.length >> 1], d = Math.hypot(m[0] - origin[0], m[1] - origin[1]);
    const t = (op.t ?? t0 + d / speed) + R() * .08;
    rasterPen(ia, ta, st, t, du, winA); strokes.push([+t.toFixed(3), du, Math.round(st.L)]);
  };
  pg.wash = (poly, col, op = {}) => wash(cx, poly, col, { a: op.a ?? .5, j: op.j ?? 5, layers: op.layers ?? 3, edge: op.edge ?? .35, seed: op.seed ?? sd++, dx: op.dx ?? 5, dy: op.dy ?? 3, freq: op.freq, edgeW: op.edgeW ?? 1.6 });
  pg.flat = (poly, col, a = .35) => wash(cx, poly, col, { a, j: 14, layers: 2, edge: .12, seed: sd++, freq: .006, step: 18 });
  pg.reserve = (poly, a = .9) => reserve(cx, poly, a, 3, sd++);
  pg.late = (poly, t, v = 900) => { late.push(poly); let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } sources.push({ x: x / poly.length, y: y / poly.length, t, v, R: 3000, mask: (px, py) => inPoly(poly, px, py), hard: true }); };
  // handwriting baked into the ink layer
  pg.text = (str, x, y, size, op = {}) => {
    const set = c => { c.font = `${op.weight ?? 400} ${size}px ${op.font ?? '"Patrick Hand SC"'}`; c.textAlign = op.align ?? 'left'; c.textBaseline = 'alphabetic'; };
    const t = op.at ?? (t0 + Math.hypot(x - origin[0], y - origin[1]) / speed), win = op.at !== undefined ? winB : winA, I = op.at !== undefined ? ib : ia, T = op.at !== undefined ? tb : ta;
    set(I); I.save(); I.globalAlpha = op.alpha ?? .92; I.translate(x, y); if (op.rot) I.rotate(op.rot); I.fillStyle = '#000'; I.fillText(str, 0, 0); I.restore();
    set(T); const w = T.measureText(str).width, n = Math.max(1, str.length), du = op.dur ?? n * .035;
    for (let i = 0; i < n; i++) { const v = Math.round(1 + clamp((t + du * i / n - win[0]) / win[1]) * 253); T.save(); T.translate(x, y); if (op.rot) T.rotate(op.rot); T.fillStyle = `rgb(${v},${v},${v})`;
      const pre = T.measureText(str.slice(0, i)).width, a0 = op.align === 'center' ? -w / 2 : 0; T.beginPath(); T.rect(a0 + pre - 1, -size * 1.2, T.measureText(str[i]).width + 2 + (i === n - 1 ? size * .35 : 0), size * 1.6); T.clip(); T.fillText(str, 0, 0); T.restore(); }
    strokes.push([t, du, Math.round(w)]);
  };
  pg.finish = () => {
    const GW = Math.ceil(W / 10), GH = Math.ceil(H / 10);
    const main = { x: origin[0], y: origin[1], t: o.colorAt ?? .55, v: o.colorV ?? 1700, R: 9000, mask: (x, y) => !late.some(p => inPoly(p, x, y)), noise: 1 };
    const arr = arrivalField(W, H, GW, GH, [main, ...sources], { amp: 120 });
    const pack = (r, g) => { const out = new Uint8Array(W * H * 4); const A = r.getImageData(0, 0, W, H).data, B = g.getImageData(0, 0, W, H).data; for (let i = 0, n = W * H; i < n; i++) { out[i * 4] = A[i * 4 + 3]; out[i * 4 + 1] = B[i * 4 + 3]; out[i * 4 + 3] = 255; } return out; };
    const packT = (r, g) => { const out = new Uint8Array(W * H * 4); const A = r.getImageData(0, 0, W, H).data, B = g.getImageData(0, 0, W, H).data; for (let i = 0, n = W * H; i < n; i++) { out[i * 4] = A[i * 4]; out[i * 4 + 1] = B[i * 4]; out[i * 4 + 3] = 255; } return out; };
    return { W, H, color: colorC, ink: pack(ia, ib), time: packT(ta, tb), arr, gw: GW, gh: GH, winA, winB, strokes };
  };

  // ----- static shapes -----
  // box: four separate sides whose ends cross at the corners
  pg.box = (x, y, w, h, col, op = {}) => {
    if (col) pg.wash(rectP(x, y, w, h), col, op);
    const e = op.cross ?? 7, lw = op.w;
    pg.pen([[x - e, y], [x + w + e, y + R() * 2]], { w: lw, at: op.at, t: op.t }); pg.pen([[x + w, y - e], [x + w + R() * 2, y + h + e]], { w: lw, at: op.at, t: op.t });
    pg.pen([[x + w + e, y + h], [x - e, y + h + R() * 2]], { w: lw, at: op.at, t: op.t }); pg.pen([[x, y + h + e], [x + R() * 2, y - e]], { w: lw, at: op.at, t: op.t });
  };
  pg.shape = (poly, col, op = {}) => { if (col) pg.wash(poly, col, op); if (op.ink !== false) pg.pen([...poly, poly[0], poly[1]], { w: op.w, at: op.at, t: op.t, smooth: op.smooth ?? false, alpha: op.alpha }); };
  pg.oval = (x, y, rx, ry, col, op = {}) => { const P = ellipse(x, y, rx, ry, 30, op.a0 ?? -1.2); if (col) pg.wash(P, col, op); if (op.ink !== false) pg.pen([...P, P[0], P[1], P[2]], { w: op.w, at: op.at, t: op.t, smooth: true, alpha: op.alpha }); };
  pg.line = (pts, op = {}) => pg.pen(pts, op);

  // ----- settings -----
  // a room: wall, floor with boards, skirting; full bleed
  pg.room = (fy, op = {}) => {
    pg.flat(rectP(-40, -40, W + 80, fy + 40), op.wall ?? PAL.wall, op.wallA ?? .42);
    pg.flat(rectP(-40, fy, W + 80, H - fy + 40), op.floor ?? PAL.floor, op.floorA ?? .34);
    pg.pen([[-30, fy], [W + 30, fy + R() * 3]], { w: 2.6 });
    pg.pen([[-30, fy - 26], [W + 30, fy - 24]], { w: 1.8, gap: .5 });
    const vx = op.vx ?? W / 2;
    if (op.boards !== false) for (let x = -W; x < W * 2; x += op.board ?? 210) { const bx = x + (vx - x) * 0; const x2 = vx + (x - vx) * 2.4; pg.pen([[bx, fy + 4], [x2, H + 40]], { w: 1.4, gap: .5, alpha: .7 }); }
    if (op.stripes) for (let x = 40; x < W; x += op.stripes) pg.pen([[x, -20], [x + R() * 4, fy - 30]], { w: 1.1, gap: .6, alpha: .45 });
  };
  pg.window = (x, y, w, h, op = {}) => {
    pg.wash(rectP(x + 8, y + 8, w - 16, h - 16), PAL.blue, { a: .45, j: 6 });
    pg.reserve(ellipse(x + w * .35, y + h * .3, w * .14, h * .06, 16), .8);
    pg.box(x, y, w, h, null); pg.box(x + 10, y + 10, w - 20, h - 20, null, { w: 1.6, cross: 4 });
    pg.line([[x + w / 2, y + 10], [x + w / 2, y + h - 10]], { w: 1.8 }); pg.line([[x + 10, y + h / 2], [x + w - 10, y + h / 2]], { w: 1.8 });
    pg.box(x - 22, y + h, w + 44, 20, PAL.white, { a: .3, cross: 5 });
    if (op.curtains !== false) for (const s of [-1, 1]) {
      const cx0 = s < 0 ? x - 40 : x + w + 40, P = [[cx0 - 46 * s * -1 * 0, y - 30], [cx0 + 70 * s * -1, y - 30], [cx0 + 50 * s * -1, y + h * .55], [cx0 + 80 * s * -1, y + h + 40], [cx0 - 10 * s * -1, y + h + 40], [cx0, y + h * .5]];
      pg.wash(P, op.curtain ?? PAL.rust, { a: .42 }); pg.pen([...P, P[0]], { w: 2, smooth: false });
      for (let k = 1; k < 4; k++) pg.pen([[lerp(P[0][0], P[1][0], k / 4), y - 25], [lerp(P[4][0], P[3][0], k / 4), y + h + 30]], { w: 1.2, alpha: .6 });
    }
    pg.line([[x - 80, y - 34], [x + w + 80, y - 34]], { w: 2.4 });
  };
  pg.frame = (x, y, w, h, col, op = {}) => { pg.box(x, y, w, h, op.mat ?? PAL.white, { a: .25 }); pg.box(x + 14, y + 14, w - 28, h - 28, col, { a: op.a ?? .4, w: 1.5, cross: 4 }); };
  pg.table = (x, y, w, h, col = PAL.blue, op = {}) => {
    const top = [[x, y], [x + w, y], [x + w + 30, y + 40], [x - 30, y + 40]];
    pg.shape(top, col, { a: .45 });
    const cloth = [[x - 30, y + 40], [x + w + 30, y + 40], [x + w + 36, y + 40 + (op.drop ?? 120)], [x - 36, y + 40 + (op.drop ?? 120)]];
    pg.shape(cloth, col, { a: .5 });
    for (let k = 1; k < 6; k++) pg.pen([[lerp(x - 30, x + w + 30, k / 6), y + 44], [lerp(x - 36, x + w + 36, k / 6) + 4, y + 36 + (op.drop ?? 120)]], { w: 1.1, alpha: .5 });
    for (const lx of [x + 10, x + w - 30]) pg.box(lx, y + 40 + (op.drop ?? 120), 22, h - 40 - (op.drop ?? 120), PAL.sand, { a: .5, cross: 4 });
  };
  pg.chair = (x, fy, s = 1, col = PAL.sand) => {
    pg.box(x, fy - 330 * s, 26 * s, 330 * s, col, { a: .5, cross: 4 }); pg.box(x, fy - 190 * s, 180 * s, 26 * s, col, { a: .5, cross: 4 });
    pg.box(x + 154 * s, fy - 165 * s, 22 * s, 165 * s, col, { a: .5, cross: 4 }); pg.box(x + 4, fy - 165 * s, 22 * s, 165 * s, col, { a: .5, cross: 4 });
    for (let k = 0; k < 3; k++) pg.line([[x + 26 * s, fy - (300 - k * 40) * s], [x + 60 * s, fy - (300 - k * 40) * s]], { w: 1.4 });
  };
  pg.plant = (x, fy, s = 1) => {
    pg.shape([[x - 60 * s, fy - 120 * s], [x + 60 * s, fy - 120 * s], [x + 44 * s, fy], [x - 44 * s, fy]], PAL.rust, { a: .5 });
    for (let k = 0; k < 9; k++) { const a = -2.6 + k * .27, L = (150 + R() * 120) * s, tip = [x + Math.cos(a) * L, fy - 120 * s + Math.sin(a) * L], mid = [x + Math.cos(a + .2) * L * .5, fy - 120 * s + Math.sin(a + .2) * L * .55];
      const leaf = [[x, fy - 120 * s], [mid[0] - 22 * s, mid[1]], tip, [mid[0] + 22 * s, mid[1] + 8]]; pg.wash(leaf, PAL.blue, { a: .45, j: 3 }); pg.pen([[x, fy - 120 * s], mid, tip], { w: 1.8, smooth: true }); pg.pen([[mid[0] - 22 * s, mid[1]], tip], { w: 1.3, alpha: .7 }); }
  };
  pg.clock = (x, y, r) => { pg.oval(x, y, r, r, PAL.white, { a: .3 }); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; pg.line([[x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8], [x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9]], { w: 1.4 }); } pg.line([[x, y], [x + r * .1, y - r * .55]], { w: 2.2 }); pg.line([[x, y], [x + r * .45, y + r * .2]], { w: 2.2 }); };
  pg.lamp = (x, y, len) => { pg.line([[x, -20], [x, y]], { w: 1.6 }); const sh = [[x - 70, y + 70], [x - 30, y], [x + 30, y], [x + 70, y + 70]]; pg.shape(sh, PAL.sand, { a: .5 }); };
  pg.shelf = (x, y, w, books = 9) => {
    pg.box(x, y, w, 16, PAL.sand, { a: .5, cross: 5 });
    let bx = x + 14; for (let k = 0; k < books && bx < x + w - 30; k++) { const bw = 22 + R() * 22, bh = 80 + R() * 60, tilt = k === books - 2 ? .25 : 0;
      const P = [[bx, y], [bx + bw, y], [bx + bw + Math.sin(tilt) * bh, y - bh], [bx + Math.sin(tilt) * bh, y - bh]]; pg.shape(P, [PAL.rust, PAL.blue, PAL.grey, PAL.sand][k % 4], { a: .5, w: 1.6 }); bx += bw + 2 + tilt * bh * .8; }
  };
  return pg;
}

// ---------- Dynamic parts (primitives redrawn every frame; they boil) ----------
// boil.n changes every 1/12 s: living things get new wobble seeds, the page itself holds still
export const boil = { n: 0 };
// p: closed polygon → knock + wash + nib ink
export function blob(prims, poly, col, o = {}) {
  const sd = (o.seed ?? 3) + boil.n * 13;
  if (o.knock !== false) prims.push({ k: 'knock', poly, a: o.knockA ?? .95 });
  if (col) prims.push({ k: 'wash', poly, col, a: o.a ?? .55, seed: sd, dx: o.dx ?? 3, dy: o.dy ?? 2, j: o.j ?? 2 });
  if (o.ink !== false) prims.push({ k: 'ink', st: penStroke([...poly, poly[0], poly[1]], { w: o.w ?? 2.4, wob: o.wob ?? .7, seed: sd, nib: 2.2, over: 3, smooth: o.smooth ?? true, gap: .2 }) });
}
export function stroke(prims, pts, o = {}) { prims.push({ k: 'ink', st: penStroke(pts, { w: o.w ?? 2.4, wob: o.wob ?? .6, seed: (o.seed ?? 5) + boil.n * 13, nib: o.nib ?? 2.4, over: o.over ?? 3, smooth: o.smooth ?? true }), alpha: o.alpha ?? 1, col: o.col }); }
export const ell = (x, y, rx, ry, n = 20, rot = 0) => [...Array(n)].map((_, i) => { const a = i / n * TAU, X = Math.cos(a) * rx, Y = Math.sin(a) * ry; return [x + X * Math.cos(rot) - Y * Math.sin(rot), y + X * Math.sin(rot) + Y * Math.cos(rot)]; });

// A drawn face on an engine head (prims.head = {c, r, fwd}). e: {mouth: flat|smile|frown|o|talk|grin, talk: 0..1, brow: -1 worried .. 1 cross, eyes: open|closed|wide|squint, look: [dx,dy], glasses, moustache, nose: 1, blink}
export function face(prims, H, e = {}, seed = 1) {
  const { c, r, fwd } = H; if (fwd[2] > .35) return;
  const sx = clamp(fwd[0] * 1.2, -1, 1), cx = c[0] + sx * r * .38, ey = c[1] - r * .02, sep = r * .3 * (1 - Math.abs(sx) * .45), lw = Math.max(1.3, r * .045);
  const L = e.look ?? [sx * .5, 0], eyes = [[cx - sep + sx * r * .05, ey], [cx + sep + sx * r * .05, ey]];
  if (Math.abs(sx) > .55) eyes.splice(sx > 0 ? 0 : 1, 1);
  for (const [x, y] of eyes) {
    const shut = e.eyes === 'closed' || e.blink;
    if (shut) stroke(prims, [[x - r * .11, y], [x, y + r * .06], [x + r * .11, y]], { w: lw, seed: seed++ });
    else if (e.eyes === 'squint') stroke(prims, [[x - r * .11, y + r * .02], [x + r * .11, y - r * .01]], { w: lw * 1.2, seed: seed++ });
    else {
      const er = r * (e.eyes === 'wide' ? .14 : .1) * (e.glasses ? .62 : 1); blob(prims, ell(x, y, er * .85, er, 12), null, { w: lw * .8, seed: seed++, knock: false });
      prims.push({ k: 'fn', fn: ctx => { ctx.fillStyle = rgba(INK, .95); ctx.beginPath(); ctx.arc(x + L[0] * er * .45, y + L[1] * er * .45 + er * .1, er * .42, 0, TAU); ctx.fill(); } });
    }
    const b = e.brow ?? 0, by = y - r * (e.eyes === 'wide' ? .27 : .22), inner = x < cx ? 1 : -1;
    stroke(prims, [[x - r * .14, by + (inner < 0 ? b * r * .07 : -b * r * .03)], [x + r * .14, by + (inner > 0 ? b * r * .07 : -b * r * .03)]], { w: lw * 1.1, seed: seed++ });
  }
  if (e.glasses) { for (const [x, y] of eyes) blob(prims, ell(x, y + r * .01, r * .22, r * .19, 14), null, { w: lw * .9, seed: seed++, knock: false }); if (eyes.length > 1) stroke(prims, [[eyes[0][0] + r * .22, ey], [eyes[1][0] - r * .22, ey]], { w: lw * .8 }); }
  // nose: a big cartoon nose pointing where the head faces
  const nx = cx + sx * r * .12, ny = ey + r * .06, k = e.nose ?? 1;
  if (Math.abs(sx) > .2) stroke(prims, [[nx, ny - r * .12], [nx + sx * r * .34 * k, ny + r * .2], [nx + sx * r * .05, ny + r * .27]], { w: lw * 1.1, seed: seed++ });
  else stroke(prims, [[nx - r * .02, ny], [nx + r * .07 * k, ny + r * .2], [nx - r * .08, ny + r * .24]], { w: lw, seed: seed++ });
  const my = ey + r * .48, mx = cx + sx * r * .08, mw = r * .22 * (1 - Math.abs(sx) * .35);
  if (e.moustache) blob(prims, [[mx - mw * 1.3, my - r * .06], [mx, my - r * .14], [mx + mw * 1.3, my - r * .06], [mx, my - r * .02]], PAL.dark, { a: .6, w: lw, seed: seed++, knock: false, smooth: true });
  const m = e.mouth ?? 'flat', tk = e.talk ?? 0;
  if (m === 'smile') stroke(prims, [[mx - mw, my - r * .04], [mx, my + r * .07], [mx + mw, my - r * .04]], { w: lw, seed: seed++ });
  else if (m === 'grin') blob(prims, [[mx - mw * 1.2, my - r * .05], [mx + mw * 1.2, my - r * .05], [mx, my + r * .14]], PAL.white, { a: .5, w: lw, seed: seed++, smooth: false });
  else if (m === 'frown') stroke(prims, [[mx - mw, my + r * .05], [mx, my - r * .03], [mx + mw, my + r * .05]], { w: lw, seed: seed++ });
  else if (m === 'o' || (m === 'talk' && tk > .25)) blob(prims, ell(mx, my + r * .02, mw * (m === 'o' ? .45 : .6), r * (m === 'o' ? .09 : .04 + .09 * tk), 12), PAL.rust, { a: .45, w: lw, seed: seed++, knockA: .9 });
  else stroke(prims, [[mx - mw * .8, my], [mx + mw * .8, my + r * .01]], { w: lw, seed: seed++ });
}

// A cartoon baby. (x, y) = bottom centre; S = size (head-to-bottom when sitting). p: {pose: sit|lie|stand, kick: phase, arm: raise 0..1, walk: phase, face: {...}, yaw: -1..1}
export function baby(x, y, S, p = {}, seed = 1) {
  const prims = [], skin = PAL.skin, lw = Math.max(1.4, S * .008), pose = p.pose ?? 'sit';
  const tube = (a, b, r, col = skin) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * r, ny = dx / l * r;
    blob(prims, [[a[0] + nx, a[1] + ny], [b[0] + nx * .9, b[1] + ny * .9], [b[0] + dx / l * r, b[1] + dy / l * r], [b[0] - nx * .9, b[1] - ny * .9], [a[0] - nx, a[1] - ny]], col, { a: .5, w: lw, seed: seed++, smooth: true }); };
  let head, body;
  if (pose === 'lie') {
    // lying on its back, head to the left; legs kick up
    const k = p.kick ?? 0, bx = x, by = y - S * .16;
    body = ell(bx, by, S * .3, S * .16, 18); head = [bx - S * .42, by - S * .06, S * .2];
    for (const s of [0, 1]) { const ph = k + s * 1.7, a = -1.2 - .55 * Math.max(0, Math.sin(ph)) - s * .15; const hip = [bx + S * .22, by - S * .02 + s * 6]; const knee = [hip[0] + Math.cos(a) * S * .2, hip[1] + Math.sin(a) * S * .2]; const foot = [knee[0] + S * .16, knee[1] - S * .02 + Math.sin(ph) * S * .04];
      tube(hip, knee, S * .07); tube(knee, foot, S * .055); blob(prims, ell(foot[0] + S * .03, foot[1], S * .05, S * .035, 10), skin, { a: .5, w: lw, seed: seed++ }); if (s === 0) prims.foot = foot; }
    blob(prims, body, PAL.white, { a: .45, w: lw * 1.1, seed: seed++ });
    blob(prims, ell(bx + S * .16, by + S * .02, S * .13, S * .12, 14), PAL.white, { a: .55, w: lw, seed: seed++ });
    for (const s of [0, 1]) { const sh = [bx - S * .18, by - S * .06], hand = [sh[0] + S * (.04 + s * .1), sh[1] - S * (.2 + .06 * Math.sin((p.kick ?? 0) * 1.3 + s))]; tube(sh, hand, S * .05); blob(prims, ell(hand[0], hand[1], S * .04, S * .04, 10), skin, { a: .5, w: lw, seed: seed++ }); }
  } else {
    const wk = p.walk, bob = wk !== undefined ? Math.abs(Math.sin(wk)) * S * .03 : 0, sway = wk !== undefined ? Math.sin(wk) * .08 : 0;
    const by = y - S * (pose === 'stand' ? .42 : .2) - bob;
    body = ell(x, by, S * .2, S * .24, 18, sway);
    head = [x + sway * S * .3, by - S * .42, S * .23];
    if (pose === 'stand') for (const s of [-1, 1]) { const ph = (wk ?? 0) + (s > 0 ? Math.PI : 0), lift = Math.max(0, Math.sin(ph)) * S * .06; tube([x + s * S * .09, by + S * .14], [x + s * S * .13 + Math.cos(ph) * S * .05, y - S * .05 - lift], S * .07); blob(prims, ell(x + s * S * .15 + Math.cos(ph) * S * .05, y - S * .03 - lift, S * .07, S * .04, 10), skin, { a: .5, w: lw, seed: seed++ }); }
    else for (const s of [-1, 1]) { tube([x + s * S * .1, by + S * .14], [x + s * S * .3, y - S * .05], S * .075); blob(prims, ell(x + s * S * .33, y - S * .06, S * .06, S * .05, 10), skin, { a: .5, w: lw, seed: seed++ }); }
    blob(prims, body, p.shirt ?? PAL.white, { a: .45, w: lw * 1.1, seed: seed++ });
    blob(prims, ell(x, by + S * .17, S * .2, S * .11, 14), PAL.white, { a: .55, w: lw, seed: seed++ });
    const arm = p.arm ?? 0;
    for (const s of [-1, 1]) { const up = s > 0 ? arm : (p.armL ?? arm * .4) ; const sh = [x + s * S * .15, by - S * .12], hand = [sh[0] + s * S * (.2 - up * .05), sh[1] + S * (.12 - up * .42)]; tube(sh, hand, S * .055); blob(prims, ell(hand[0], hand[1], S * .05, S * .05, 10), skin, { a: .5, w: lw, seed: seed++ }); }
  }
  const [hx, hy, hr] = head;
  blob(prims, ell(hx, hy, hr, hr * .95, 22), skin, { a: .5, w: lw * 1.2, seed: seed++ });
  stroke(prims, [[hx - hr * .1, hy - hr * .95], [hx + hr * .05, hy - hr * 1.2], [hx + hr * .2, hy - hr * 1.05], [hx + hr * .08, hy - hr * .92]], { w: lw, seed: seed++ });   // the one curl
  for (const s of [-1, 1]) blob(prims, ell(hx + s * hr * .98, hy + hr * .05, hr * .14, hr * .2, 10), skin, { a: .5, w: lw * .8, seed: seed++ });   // ears
  const yaw = pose === 'lie' ? .0 : (p.yaw ?? 0);
  face(prims, { c: [hx, hy + hr * .12], r: hr * .9, fwd: [yaw, 0, -1] }, { nose: .4, ...(p.face ?? {}) }, seed + 50);
  prims.push({ k: 'fn', fn: ctx => { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(PAL.rust, .18); for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * hr * .5 + yaw * hr * .3, hy + hr * .38, hr * .14, hr * .09, 0, 0, TAU); ctx.fill(); } ctx.restore(); } });
  prims.head = { c: [hx, hy], r: hr };
  return prims;
}

export function mouse(x, y, S, p = {}, seed = 1) {
  const prims = [], lw = Math.max(1.3, S * .012), d = p.dir ?? 1;
  stroke(prims, [[x - d * S * .45, y - S * .12], [x - d * S * .75, y - S * .3], [x - d * S * .95, y - S * .2]], { w: lw, seed: seed++ });
  blob(prims, ell(x, y - S * .22, S * .45, S * .22, 18), PAL.grey, { a: .5, w: lw * 1.2, seed: seed++ });
  const hx = x + d * S * .45, hy = y - S * .32;
  blob(prims, ell(hx - d * S * .05, hy - S * .2, S * .14, S * .14, 12), pale(PAL.rust, .5), { a: .5, w: lw, seed: seed++ });
  blob(prims, [[hx - d * S * .2, hy - S * .14], [hx + d * S * .28, hy + S * .02], [hx - d * S * .15, hy + S * .14]], PAL.grey, { a: .5, w: lw, seed: seed++, smooth: true });
  prims.push({ k: 'fn', fn: ctx => { ctx.fillStyle = rgba(INK, .95); ctx.beginPath(); ctx.arc(hx, hy - S * .02, S * .03, 0, TAU); ctx.arc(hx + d * S * .28, hy + S * .02, S * .025, 0, TAU); ctx.fill(); } });
  for (const s of [-.15, .2]) stroke(prims, [[x + s * S, y - S * .02], [x + s * S + d * S * .05, y + S * .02]], { w: lw, seed: seed++ });
  if (p.hat) blob(prims, [[hx - d * S * .25, hy - S * .2], [hx - d * S * .12, hy - S * .42], [hx + d * S * .12, hy - S * .38], [hx + d * S * .16, hy - S * .18]], PAL.sand, { a: .7, w: lw, seed: seed++, smooth: true });
  prims.head = [hx, hy];
  return prims;
}

// thought / speech bubble with an optional tail toward (tx, ty)
export function bubble(prims, x, y, rx, ry, tx, ty, o = {}) {
  const P = []; const n = 14; for (let i = 0; i < n; i++) { const a = i / n * TAU, w = o.cloud ? 1 + .1 * Math.sin(a * 7) : 1; P.push([x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w]); }
  blob(prims, P, o.col ?? null, { a: .25, w: 2.2, seed: o.seed ?? 9, knockA: .97 });
  if (tx !== undefined) {
    if (o.cloud) for (let k = 1; k <= 3; k++) { const u = k / 4; blob(prims, ell(lerp(x, tx, .55 + u * .4), lerp(y + ry * .8, ty, .55 + u * .4), 14 - k * 3, 11 - k * 2, 10), null, { w: 1.8, seed: (o.seed ?? 9) + k }); }
    else { const a = Math.atan2(ty - y, tx - x), bx = x + Math.cos(a) * rx * .8, by = y + Math.sin(a) * ry * .8; blob(prims, [[bx - 26, by], [tx, ty], [bx + 26, by + 4]], null, { w: 2, seed: (o.seed ?? 9) + 5, smooth: false, knockA: .97 }); }
  }
}
