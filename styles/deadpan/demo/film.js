// Deadpan Style (test) — timeline, camera, caption, render. Scenes are in scenes.js.
// Style: Deadpan Style (New Yorker cartoon, ink and wash), drawn with the Urban Sketch engine (copied from the Lemo-Opuscar library and changed).
import { clamp, lerp, ss, TAU, rng, n2, rgba, INK, PAPER, compositor, drawPrims, ellipse, rough } from './engine.js';
import { makePage, boil } from './kit.js';
import { SCENES, ORDER } from './scenes.js';

export const W = 2400, H = 1350;
const TITLE = 3.5, LEAD = .8, TAIL = 1.4, END = 1.5;
const q = new URLSearchParams(location.search);
await Promise.all(['44px "Patrick Hand SC"', '80px Caveat', '60px "Reenie Beanie"'].map(f => document.fonts.load(f)));
const dur = await (await fetch('voice/dur.json')).json();
const words = await (await fetch('voice/words.json')).json();

// ---------- timeline: the same numbers mix.py uses ----------
const TL = []; let tt = 0;
TL.push({ id: 'title', start: 0, len: TITLE, vo: 0, caption: null }); tt = TITLE;
const caps = await (await fetch('lines.json')).json();
for (const id of ORDER) { const vo = dur[id], len = LEAD + vo + TAIL; TL.push({ id, start: tt, len, vo, caption: caps.find(c => c.id === id)?.caption }); tt += len; }
const DUR = +(tt + END).toFixed(2);
TL[TL.length - 1].len += END;
window.DUR = DUR; window.TIMELINE = { lead: LEAD, total: DUR, scenes: TL };

// ---------- helpers ----------
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const talkOf = id => u => { const v = u - LEAD, ws = words[id]; if (!ws || v < 0) return 0; for (const w of ws) if (v >= w[1] - .02 && v <= w[2] + .02) return .55 + .45 * Math.sin(v * 31 + w[1] * 7); return 0; };
const boilOf = u => Math.floor(u * 12);

// ---------- canvases ----------
const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
const glc = document.createElement('canvas'); glc.width = 1920; glc.height = 1080;
const cache = {};
function pageFor(sc) {
  if (cache.id === sc.id) return;
  const S = SCENES[sc.id], pg = makePage(W, H, { seed: S.seed ?? 11, len: sc.len, origin: S.origin ?? [W / 2, H / 2], speed: S.speed ?? 1500, colorAt: S.colorAt ?? .55, colorV: S.colorV ?? 1700 });
  S.build(pg, sc.len, sc);
  const L = pg.finish(); cache.id = sc.id; cache.L = L;
  if (cache.comp) cache.comp.load(L); else cache.comp = compositor(glc, L);
}
pageFor(TL[0]);
const tooth = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const im = x.createImageData(512, 512); const R = rng(77);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) { const v = n2(i * .35, j * .35, 3) * .6 + n2(i * .09, j * .09, 5) * .4; const g = 255 - Math.max(0, (v - .55)) * 45 - (R() < .004 ? 22 : 0); const k = (j * 512 + i) * 4; im.data[k] = g; im.data[k + 1] = g * .997; im.data[k + 2] = g * .99; im.data[k + 3] = 255; }
  x.putImageData(im, 0, 0); return c; })();
const toothPat = ctx.createPattern(tooth, 'repeat');

// ---------- caption: hand-lettered, written letter by letter, in the lower margin ----------
const CAP_SIZE = 40, CAP_Y = 1034;
function captionBox(sc, u) {
  if (!sc.caption) return null;
  ctx.save(); ctx.font = `${CAP_SIZE}px "Patrick Hand SC"`; const w = ctx.measureText(sc.caption).width; ctx.restore();
  const t0 = LEAD + .7, wr = Math.max(.9, sc.caption.length * .045), p = clamp((u - t0) / wr), hold = u < sc.len - .45;
  return { w, p, show: u > t0 && hold, x0: 960 - w / 2, x1: 960 + w / 2 };
}
function drawCaption(sc, u) {
  const b = captionBox(sc, u); if (!b || !b.show) return;
  ctx.save();
  const pad = 46, x0 = b.x0 - pad, x1 = b.x1 + pad, y0 = CAP_Y - 50, y1 = CAP_Y + 24;
  const R = rng(5), poly = []; const n = 22;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; poly.push([960 + Math.cos(a) * (x1 - x0) / 2 * (1 + .03 * (R() - .5)), 1034 - 12 + Math.sin(a) * (y1 - y0) / 2 * (1 + .1 * (R() - .5))]); }
  ctx.fillStyle = 'rgba(251,248,241,.9)'; ctx.shadowColor = 'rgba(251,248,241,.9)'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]); for (const p of poly) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.beginPath(); ctx.rect(b.x0 - 6, CAP_Y - 60, (b.w + 12) * b.p, 100); ctx.clip();
  ctx.font = `${CAP_SIZE}px "Patrick Hand SC"`; ctx.fillStyle = rgba(INK, .95); ctx.textBaseline = 'alphabetic'; ctx.fillText(sc.caption, b.x0, CAP_Y);
  ctx.restore();
}
window.TEXTS = t => { const sc = TL.find(s => t >= s.start && t < s.start + s.len) ?? TL[TL.length - 1]; if (!sc.caption) return []; const u = t - sc.start, b = captionBox(sc, u); return b && b.show ? [{ id: sc.id + '-cap', text: sc.caption, x0: b.x0, y0: CAP_Y - 40, x1: b.x1, y1: CAP_Y + 12 }] : []; };

// ---------- render ----------
window.render = t => {
  t = clamp(t, 0, DUR - 1e-3);
  const sc = TL.find(s => t >= s.start && t < s.start + s.len) ?? TL[TL.length - 1], S = SCENES[sc.id], u = t - sc.start, d = sc.len;
  pageFor(sc); boil.n = boilOf(u);
  const base = S.cam ? S.cam(u, d) : { cx: W / 2, cy: H / 2, z: .8 };
  const drift = { cx: base.cx + Math.sin(u * .35) * 8, cy: base.cy + Math.cos(u * .27) * 5, z: base.z * (1 + .018 * u / d) };
  const cam = { ...drift, rot: base.rot ?? 0 };
  cache.comp(cam, u);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(glc, 0, 0);
  const c = Math.cos(cam.rot), s = Math.sin(cam.rot);
  ctx.setTransform(cam.z * c, cam.z * s, -cam.z * s, cam.z * c, 960 - cam.z * (c * cam.cx - s * cam.cy), 540 - cam.z * (s * cam.cx + c * cam.cy));
  S.draw?.(ctx, u, d, { talk: talkOf(sc.id), boil: boil.n, voiceT: u - LEAD, W, H, cam });
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = toothPat;
  ctx.setTransform(cam.z * c * .8, cam.z * s * .8, -cam.z * s * .8, cam.z * c * .8, 960 - cam.z * (c * cam.cx - s * cam.cy), 540 - cam.z * (s * cam.cx + c * cam.cy));
  const iz = 1 / (cam.z * .8); ctx.fillRect((cam.cx - 1300 / cam.z) / .8, (cam.cy - 800 / cam.z) / .8, 2600 * iz, 1600 * iz); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawCaption(sc, u);
  // page turn: the old page washes out to paper before the next one is drawn
  const fade = clamp((u - (d - .4)) / .4); if (fade > 0 && t < DUR - END) { ctx.fillStyle = rgba(PAPER, fade); ctx.fillRect(0, 0, 1920, 1080); }
  if (t >= DUR - END) { const k = clamp((t - (DUR - END)) / .9); ctx.fillStyle = rgba(PAPER, k); ctx.fillRect(0, 0, 1920, 1080); }
};

// sound events for the mixer: scene starts, pen hiss windows, and what each scene adds
const EV = [];
for (const sc of TL) { EV.push({ t: +sc.start.toFixed(3), type: 'page', id: sc.id }); EV.push({ t: +(sc.start + .15).toFixed(3), type: 'pen', d: 3.2 }); const S = SCENES[sc.id]; for (const e of S.ev ?? []) EV.push({ ...e, t: +(sc.start + e.t).toFixed(3) }); if (sc.caption) EV.push({ t: +(sc.start + LEAD + .7).toFixed(3), type: 'write', d: Math.max(.9, sc.caption.length * .045) }); }
window.EV = EV;
window.READY = true;
