// Shared drawing parts for the scenes: people, memories, props. Everything is code (engine.js + kit.js).
import { hex, clamp, lerp, ss, TAU, rgba, INK, figure, drawPrims, R3 } from './engine.js';
import { PAL, blob, stroke, ell, face, baby, mouse, bubble, boil, pale } from './kit.js';
import { stand } from './poses.js';
export const { V } = R3;
export { PAL, blob, stroke, ell, face, baby, mouse, bubble, boil, pale, drawPrims };

export const LOOK = {
  man:   { skin: hex('#EBC3A5'), top: hex('#8FA8BF'), bottom: hex('#CDB690'), hair: hex('#6E5340'), pants: 1, head: 1.55, torso: [.082, .09, .112], shoe: hex('#5B5A63') },
  host:  { skin: hex('#EBC3A5'), top: hex('#C45C32'), bottom: hex('#9698A0'), hair: hex('#EBC3A5'), hairVol: .98, pants: 1, head: 1.55, torso: [.082, .09, .112], shoe: hex('#5B5A63') },
  aunt:  { skin: hex('#F0CDB2'), top: hex('#C45C32'), hair: hex('#9698A0'), dress: 1, sleeve: 'none', hairLong: 1, head: 1.5, torso: [.09, .08, .1], flare: .18, shoe: hex('#5B5A63') },
  mum:   { skin: hex('#F0CDB2'), top: hex('#78A0BE'), hair: hex('#7A4A33'), dress: 1, sleeve: 'none', hairLong: 1, head: 1.5, torso: [.09, .08, .1], flare: .18, shoe: hex('#8a6a4a') },
  nurse: { skin: hex('#D9A383'), top: hex('#F4F1EA'), bottom: hex('#78A0BE'), hair: hex('#3a2c28'), pants: 1, head: 1.5, torso: [.08, .088, .108], shoe: hex('#F4F1EA') },
};

// An adult with a cartoon face. e: face options; talk: 0..1 mouth; pose: engine pose
export function person(look, x, y, S, yaw, pose, e = {}, talk = 0, seed = 1) {
  const pr = figure(look, pose ?? stand(), { x, y, S, yaw }, { seed, boil: boil.n });
  face(pr, pr.head, { mouth: talk > .25 ? 'talk' : (e.mouth ?? 'flat'), talk, nose: 1.3, ...e }, seed * 7);
  return pr;
}
export const FRONT = Math.PI * .93;

export const popIn = (u, t0, d = .35) => { const k = clamp((u - t0) / d); return k <= 0 ? 0 : 1 + 1.2 * Math.pow(k - 1, 3) + 0 * k; };   // 0 → overshoot → 1
export const fadeOut = (u, t0, d = .4) => 1 - clamp((u - t0) / d);

// draw prims scaled about (cx, cy) with alpha
export function placed(ctx, prims, cx, cy, s = 1, a = 1, o = {}) {
  if (a <= 0 || s <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  drawPrims(ctx, prims, { color: o.color ?? 1, ink: 1 }); ctx.restore();
}

// ---------- little drawings (each built around (0,0), returns prims) ----------
export function cake(x, y, s = 1, flick = 0) {
  const p = [], w = 1.8 * s;
  blob(p, [[x - 100 * s, y], [x + 100 * s, y], [x + 100 * s, y - 60 * s], [x - 100 * s, y - 60 * s]], PAL.sand, { a: .55, w, seed: 3, smooth: false });
  blob(p, [[x - 100 * s, y - 60 * s], [x + 100 * s, y - 60 * s], [x + 108 * s, y - 80 * s], [x - 108 * s, y - 80 * s]], PAL.rust, { a: .45, w, seed: 4, smooth: false });
  blob(p, [[x - 64 * s, y - 80 * s], [x + 64 * s, y - 80 * s], [x + 64 * s, y - 135 * s], [x - 64 * s, y - 135 * s]], pale(PAL.sand, .3), { a: .6, w, seed: 5, smooth: false });
  blob(p, [[x - 64 * s, y - 135 * s], [x + 64 * s, y - 135 * s], [x + 72 * s, y - 152 * s], [x - 72 * s, y - 152 * s]], PAL.blue, { a: .5, w, seed: 6, smooth: false });
  for (const k of [-1, 0, 1]) { const cx = x + k * 36 * s; stroke(p, [[cx, y - 152 * s], [cx, y - 188 * s]], { w: 2.6 * s, seed: 7 + k }); blob(p, ell(cx + Math.sin(flick + k) * 2, y - 202 * s, 7 * s, 13 * s, 8), PAL.rust, { a: .7, w: 1.3, seed: 12 + k, knock: false }); }
  return p;
}
export function dog(x, y, s = 1, wag = 0) {
  const p = [], w = 2 * s;
  stroke(p, [[x - 78 * s, y - 52 * s], [x - 118 * s, y - 92 * s + Math.sin(wag) * 12 * s], [x - 128 * s, y - 122 * s + Math.sin(wag) * 18 * s]], { w, seed: 21 });
  blob(p, ell(x, y - 50 * s, 82 * s, 40 * s, 18), PAL.sand, { a: .6, w, seed: 22 });
  for (const lx of [-52, -22, 34, 62]) blob(p, [[x + lx * s - 11 * s, y - 20 * s], [x + lx * s + 11 * s, y - 20 * s], [x + lx * s + 9 * s, y + 2 * s], [x + lx * s - 9 * s, y + 2 * s]], PAL.sand, { a: .6, w: 1.6 * s, seed: 23 + lx, smooth: false });
  blob(p, ell(x + 92 * s, y - 92 * s, 34 * s, 30 * s, 14), PAL.sand, { a: .6, w, seed: 31 });
  blob(p, ell(x + 122 * s, y - 80 * s, 20 * s, 14 * s, 10), PAL.sand, { a: .6, w: 1.6 * s, seed: 32 });
  blob(p, [[x + 72 * s, y - 108 * s], [x + 62 * s, y - 62 * s], [x + 88 * s, y - 74 * s]], PAL.rust, { a: .5, w: 1.6 * s, seed: 33, knock: false });
  p.push({ k: 'fn', fn: c => { c.fillStyle = rgba(INK, .95); c.beginPath(); c.arc(x + 100 * s, y - 98 * s, 3.4 * s, 0, TAU); c.arc(x + 138 * s, y - 84 * s, 5 * s, 0, TAU); c.fill(); } });
  return p;
}
export function haircut(x, y, s = 1, snip = 0) {
  const p = [], w = 2 * s;
  blob(p, ell(x, y - 60 * s, 46 * s, 50 * s, 16), PAL.skin, { a: .55, w, seed: 41 });
  blob(p, [[x - 46 * s, y - 70 * s], [x - 30 * s, y - 112 * s], [x + 20 * s, y - 116 * s], [x + 46 * s, y - 72 * s], [x + 20 * s, y - 84 * s]], hex('#7A4A33'), { a: .7, w, seed: 42, knock: false });
  for (const k of [-1, 1]) { stroke(p, [[x + k * 14 * s, y - 62 * s], [x + k * 14 * s, y - 62 * s + 3]], { w: 6 * s, seed: 43 + k }); }
  stroke(p, [[x - 14 * s, y - 36 * s], [x, y - 28 * s], [x + 14 * s, y - 36 * s]], { w: 1.8 * s, seed: 47 });
  const a = .25 + .3 * Math.sin(snip * 14);
  for (const k of [-1, 1]) { const ax = x + 78 * s, ay = y - 96 * s; stroke(p, [[ax, ay], [ax - 62 * s, ay + (k * 12 + a * k * 20) * s]], { w: 3 * s, seed: 51 + k }); blob(p, ell(ax + 14 * s, ay + k * 14 * s, 11 * s, 7 * s, 8, k * .5), null, { w: 2 * s, seed: 53 + k, knock: false }); }
  for (let k = 0; k < 3; k++) stroke(p, [[x + (k - 1) * 40 * s, y - 132 * s + k * 10], [x + (k - 1) * 40 * s - 8, y - 112 * s + k * 10]], { w: 1.8 * s, seed: 60 + k, alpha: .7 });
  return p;
}
export function bigQ(x, y, s = 1, seed = 1) { const p = []; stroke(p, [[x - 38 * s, y - 70 * s], [x - 30 * s, y - 104 * s], [x + 6 * s, y - 112 * s], [x + 38 * s, y - 94 * s], [x + 34 * s, y - 62 * s], [x + 8 * s, y - 40 * s], [x + 6 * s, y - 14 * s]], { w: 6 * s, seed, nib: 2.6 }); blob(p, ell(x + 6 * s, y + 16 * s, 6.5 * s, 6.5 * s, 8), null, { w: 4 * s, seed: seed + 1, knock: false }); return p; }
export function star(x, y, r, col = PAL.sand) { const P = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * .45 : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } const p = []; blob(p, P, col, { a: .6, w: 2.2, seed: 77, smooth: false }); return p; }

// dotted outline of something that is not really there (ink only)
export function ghost(prims, poly, seed = 1) { for (let i = 0; i < poly.length; i += 2) { const a = poly[i], b = poly[(i + 1) % poly.length]; stroke(prims, [a, [lerp(a[0], b[0], .6), lerp(a[1], b[1], .6)]], { w: 2.2, seed: seed + i, alpha: .55, smooth: false }); } }
