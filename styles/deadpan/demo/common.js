import { clamp, rgba, INK, TAU } from './engine.js';
import { PAL, pale } from './parts.js';
export const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export function shadowAt(ctx, x, y, rx, a = .22) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(110,118,140,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .12, 0, 0, TAU); ctx.fill(); ctx.restore(); }
export function say(ctx, text, x, y, size, p = 1, o = {}) {
  if (p <= 0) return; ctx.save(); ctx.font = `${o.weight ?? 400} ${size}px ${o.font ?? '"Patrick Hand SC"'}`; const w = ctx.measureText(text).width, a = o.align === 'center' ? x - w / 2 : x;
  ctx.beginPath(); ctx.rect(a - 8, y - size * 1.2, (w + 16) * clamp(p), size * 1.8); ctx.clip(); ctx.fillStyle = rgba(o.col ?? INK, o.alpha ?? .94); if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); ctx.fillText(text, o.align === 'center' ? -w / 2 : 0, 0); } else ctx.fillText(text, a, y); ctx.restore();
}
export const wall = (pg, op = {}) => pg.room(1010, { wall: pale(PAL.sand, .35), wallA: .45, floor: PAL.floor, floorA: .3, boards: false, stripes: 0, ...op });
// small deterministic random
export const rnd = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// a hand-drawn four-point star mark, drawn straight to the canvas (cheap, for fields of stars)
export function mark(ctx, x, y, r, a = 1, glow = 0) {
  ctx.save(); if (glow > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(PAL.sand, .75 * glow * a); ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.strokeStyle = rgba(INK, .9 * a); ctx.lineWidth = Math.max(1.4, r * .13); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); ctx.restore();
}
