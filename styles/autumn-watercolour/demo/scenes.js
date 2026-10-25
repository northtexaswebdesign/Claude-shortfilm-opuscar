// Why Do We Sneeze at the Sun? — eight pages in Autumn Transparent Watercolour. Scene time u: the voice starts at u = .8.
import { clamp, lerp, ss, TAU, hex, rgba, INK, mix3, ellipse } from './engine.js';
import { PAL, blob, stroke, ell, pale, rectP } from './kit.js';
import { popIn, placed, drawPrims, bigQ } from './parts.js';
import { toon, LOOKS, POSE } from './toon.js';
import { eio, seg, shadowAt, say } from './common.js';
import { AU } from './wc.js';

const HZ = 900, FL = 1060;
const draw = (ctx, P) => drawPrims(ctx, P, { color: 1, ink: 1 });
const L = {
  walker:  { ...LOOKS.clerk, top: AU.rust, bottom: hex('#6E6878'), tie: AU.gold },
  woman:   { ...LOOKS.woman, top: AU.gold, bottom: AU.mist },
  grandma: { ...LOOKS.grandma, top: AU.scarlet, bottom: AU.scarlet },
  kid:     { ...LOOKS.kid, top: AU.scarlet, bottom: hex('#7E8AA0') },
  nerd:    { ...LOOKS.nerd, top: AU.rust },
  boss:    { ...LOOKS.boss, top: hex('#6E6878'), bottom: hex('#6E6878'), tie: AU.scarlet },
  clerk:   { ...LOOKS.clerk, top: AU.mist, tie: AU.rust },
};

// a sneeze at t0: wind-up (head back, eyes squeezed), burst (head forward), settle. Returns pose bits + spray
function sneeze(u, t0) {
  if (u < t0 - 1.0 || u > t0 + 1.4) return null;
  if (u < t0) { const k = eio(seg(u, t0 - 1.0, t0)); return { head: -.3 * k, lean: -.05 * k, face: { eyes: k > .5 ? 'closed' : 'squint', mouth: 'o', brow: -.6 * k }, spray: 0 }; }
  const k = seg(u, t0, t0 + .18), back = eio(seg(u, t0 + .5, t0 + 1.4));
  return { head: lerp(.38 * k, 0, back), lean: lerp(.2 * k, 0, back), face: { eyes: back < .6 ? 'closed' : 'half', mouth: back < .5 ? 'talk' : 'flat', talk: 1, brow: -.3 }, spray: seg(u, t0, t0 + 1.4) };
}
function spray(ctx, P, dir, k, seed = 1) {
  if (!k || k <= 0 || k >= 1) return;
  const { c, r } = P.head, x0 = c[0] + dir * r * 1.15, y0 = c[1] + r * .4, a = 1 - k;
  ctx.save(); ctx.globalAlpha = a * .85;
  for (let i = 0; i < 4; i++) { const d = (60 + i * 70) * eio(Math.min(1, k * 2)), Q = []; blob(Q, ell(x0 + dir * d, y0 + (i - 1.5) * 12 * k, 30 + i * 22 * k, 20 + i * 14 * k, 14), AU.mist, { a: .35, w: 1.2, seed: seed + i, knockA: .15 }); draw(ctx, Q); }
  ctx.fillStyle = rgba(mix3(AU.mist, AU.violet, .6), .8);
  for (let i = 0; i < 26; i++) { const ang = (i / 26 - .5) * 1.1, d = 40 + 340 * eio(k) * (.5 + ((i * 37) % 10) / 20); ctx.beginPath(); ctx.arc(x0 + dir * Math.cos(ang) * d, y0 + Math.sin(ang) * d * .7, 2.5 + (i % 3), 0, TAU); ctx.fill(); }
  ctx.restore();
}
// one person who may sneeze at the given times
function person(ctx, look, pose, x, y, S, u, o = {}) {
  let sn = null; for (const t0 of o.sneezes ?? []) { sn = sneeze(u, t0); if (sn) break; }
  const p = { ...pose, head: (pose.head ?? 0) + (sn?.head ?? 0), lean: (pose.lean ?? 0) + (sn?.lean ?? 0) };
  const P = toon(look, p, x, y, S, { dir: o.dir ?? 1, t: u + (o.ph ?? 0), face: sn ? { ...o.face, ...sn.face } : o.face, seed: o.seed ?? 3 });
  if (o.shadow !== false) shadowAt(ctx, x + 40, y, S * .22, .16);
  draw(ctx, P); if (sn) spray(ctx, P, o.dir ?? 1, sn.spray, o.seed ?? 3);
  return P;
}
// landscape: wet-in-wet sky, mist band, pale green-ochre ground
function land(pg, o = {}) {
  pg.wet(rectP(-60, -60, 2520, (o.hz ?? HZ) + 120), [AU.sky, AU.skyLow, AU.mist], { a: .42 });
  pg.wet(rectP(-60, (o.hz ?? HZ) - 90, 2520, 200), [AU.mist, AU.violet], { a: .22, blur: 30 });
  const G = o.hill ? [[-60, HZ + 40], [500, HZ - 60], [1200, HZ - 110], [1900, HZ - 50], [2460, HZ + 20], [2460, 1420], [-60, 1420]] : rectP(-60, o.hz ?? HZ, 2520, 600);
  pg.glaze(G, AU.ground, { a: .42, n: 1, step: .1, push: .05 });
  if (o.bloom) pg.bloom(o.bloom[0], o.bloom[1], 240, AU.ground);
}
function sun(pg, x, y, r = 70) { pg.wash(ellipse(x, y, r * 2.6, r * 2.6, 30), AU.gold, { a: .16, j: 16, edge: 0, layers: 3 }); pg.reserve(ellipse(x, y, r, r, 30), 1, 2); }

export const SCENES = {
  title: {
    seed: 3, origin: [1200, 600], speed: 1100, colorAt: .6, leaves: 3,
    build(pg) {
      land(pg, { hill: true, bloom: [1700, 300] }); sun(pg, 360, 230);
      pg.tree(300, HZ + 30, 520, { cols: [AU.gold, AU.rust] }); pg.tree(2150, HZ, 600, { cols: [AU.scarlet, AU.gold, AU.rust] }); pg.scrub(1800, HZ + 40, 260);
      pg.text('Why Do We Sneeze', 1200, 520, 140, { font: 'Caveat', weight: 600, align: 'center', dur: 1.0 });
      pg.text('at the Sun?', 1200, 670, 140, { font: 'Caveat', weight: 600, align: 'center', dur: .8, t: 1.0 });
      pg.text('a Deadpan Why question', 1200, 770, 56, { font: '"Reenie Beanie"', align: 'center', dur: 1.0, t: 1.9 });
    },
    cam: (u, d) => ({ cx: lerp(1150, 1250, ss(u / d)), cy: 640, z: .8 + .04 * ss(u / d) }),
    draw() {},
  },

  // ------------------------------------------------------------ s1: out of the cinema, into the sun (hook)
  s1: {
    seed: 11, origin: [600, 600], capAt: 5.6,
    build(pg) {
      land(pg, { hz: FL - 40, bloom: [1500, 250] }); sun(pg, 900, 180, 64);
      pg.glaze(rectP(40, 260, 700, 760), AU.mist, { a: .5, n: 2, shade: AU.violet });
      pg.glaze(rectP(330, 680, 250, 340), hex('#5E5868'), { a: .7, n: 1 });
      pg.glaze(rectP(120, 300, 540, 120), AU.gold, { a: .55, n: 1 }); pg.text('CINEMA', 390, 390, 92, { font: 'Caveat', weight: 600, align: 'center', alpha: .8 });
      pg.tree(1500, FL - 30, 620, { cols: [AU.gold, AU.scarlet] }); pg.tree(2180, FL - 30, 700, { cols: [AU.rust, AU.gold, AU.scarlet] }); pg.scrub(1850, FL - 20, 300, AU.scarlet);
      pg.ripples(780, FL + 30, 2400, FL + 300, AU.groundDk, { n: 40 });
    },
    cam: (u, d) => ({ cx: lerp(1100, 1260, eio(u / d)), cy: 660, z: lerp(.8, .86, eio(u / d)) }),
    ev: [{ t: 1.0, type: 'creak' }, { t: 4.9, type: 'sneeze' }],
    draw(ctx, u) {
      const walk = seg(u, 1.0, 3.8), x = lerp(470, 960, eio(walk)), turn = u > 9.4;
      person(ctx, L.walker, walk > 0 && walk < 1 ? POSE.walk : POSE.stand, x, 1150, 760, u, { dir: turn ? -1 : 1, sneezes: [4.9],
        face: u < 2.8 ? { eyes: 'half' } : u < 6.2 ? { eyes: 'squint', brow: -.4 } : turn ? { eyes: 'half', brow: .6, look: [-.5, -.8] } : { eyes: 'half', mouth: 'flat' }, seed: 3 });
    },
  },

  // ------------------------------------------------------------ s2: how common, Aristotle, ACHOO (mystery)
  s2: {
    seed: 22, origin: [1200, 500], capAt: 17.2,
    build(pg) {
      land(pg, { hill: true, bloom: [600, 260] }); sun(pg, 300, 170, 60);
      pg.tree(2250, HZ, 520, { cols: [AU.gold, AU.scarlet] }); pg.scrub(140, HZ + 40, 240);
      pg.text('studies: 10–35% of people', 1200, 150, 66, { font: 'Caveat', weight: 600, align: 'center', at: 5.2 });
    },
    cam: (u, d) => ({ cx: 1200, cy: lerp(680, 640, eio(u / d)), z: lerp(.8, .83, eio(u / d)) }),
    ev: [{ t: 6.9, type: 'sneeze' }, { t: 8.6, type: 'sneeze' }, { t: 16.1, type: 'tiles', d: .7 }],
    draw(ctx, u) {
      const cast = ['clerk', 'woman', 'kid', 'nerd', 'grandma', 'boss', 'walker', 'woman', 'clerk', 'nerd'];
      cast.forEach((nm, i) => { const x = 230 + i * 215, y = 1230 - Math.sin(i / 9 * Math.PI) * 60, sn = i === 3 ? [6.9] : (i === 0 || i === 5 || i === 8) ? [8.6] : [];
        person(ctx, L[nm], POSE.stand, x, y, nm === 'kid' ? 300 : 400, u, { dir: i < 5 ? -1 : -1, sneezes: sn, face: { eyes: 'half', look: [-.6, -.6] }, seed: 10 + i, ph: i }); });
      if (u > 6.9) say(ctx, '1 in 10', 230 + 3 * 215, 760, 52, seg(u, 7.0, 7.5), { font: 'Caveat', weight: 600, align: 'center' });
      if (u > 8.6) say(ctx, '1 in 3', 230 + 5 * 215, 760, 52, seg(u, 8.7, 9.2), { font: 'Caveat', weight: 600, align: 'center' });
      // Aristotle on a plinth (paints in at 9.7), and the ACHOO sign (15.4)
      if (u > 9.7) { const k = popIn(u, 9.7, .5), A = []; blob(A, rectP(1110, 520, 180, 150), AU.mist, { a: .5, w: 2, seed: 61, smooth: false }); blob(A, [[1130, 520], [1270, 520], [1250, 420], [1150, 420]], pale(AU.mist, .3), { a: .45, w: 2, seed: 62 }); blob(A, ell(1200, 360, 58, 70, 18), pale(AU.mist, .2), { a: .5, w: 2, seed: 63 });
        blob(A, [[1150, 380], [1250, 380], [1236, 452], [1200, 470], [1164, 452]], AU.violet, { a: .35, w: 1.6, seed: 64 }); placed(ctx, A, 1200, 670, k, 1); say(ctx, 'Aristotle, ~350 BC', 1200, 720, 46, seg(u, 10.2, 11), { font: 'Caveat', weight: 600, align: 'center' }); }
      if (u > 11) { const k = popIn(u, 11, .4); placed(ctx, bigQ(1340, 330, .8, 5), 1340, 330, k, 1); }
      if (u > 15.4) { const k = popIn(u, 15.4, .4), S = []; stroke(S, [[2060, 760], [2060, 1000]], { w: 6, seed: 70 }); blob(S, rectP(1880, 380, 360, 380), AU.rust, { a: .5, w: 2.2, seed: 71, smooth: false }); placed(ctx, S, 2060, 1000, k, 1);
        say(ctx, 'ACHOO', 2060, 560, 100, seg(u, 16.1, 16.8), { font: 'Caveat', weight: 600, align: 'center' });
        say(ctx, 'Autosomal Dominant', 2060, 630, 34, seg(u, 17.4, 17.9), { font: 'Caveat', weight: 600, align: 'center' }); say(ctx, 'Compelling Helio-', 2060, 672, 34, seg(u, 17.9, 18.4), { font: 'Caveat', weight: 600, align: 'center' }); say(ctx, 'Ophthalmic Outburst', 2060, 714, 34, seg(u, 18.4, 18.9), { font: 'Caveat', weight: 600, align: 'center' }); }
    },
  },

  // ------------------------------------------------------------ s3: a normal sneeze (explanation)
  s3: {
    seed: 33, origin: [1300, 600], capAt: 19.3, leaves: 1,
    build(pg) {
      pg.wet(rectP(-60, -60, 2520, 1500), [pale(AU.sky, .3), AU.skyLow, pale(AU.gold, .6)], { a: .35 });
      pg.bloom(700, 1000, 260, AU.gold);
      pg.text('a normal sneeze', 400, 170, 72, { font: 'Caveat', weight: 600, align: 'center', at: .9 });
    },
    cam: (u, d) => ({ cx: lerp(1200, 1150, eio(u / d)), cy: 650, z: lerp(.8, .86, eio(u / d)) }),
    ev: [{ t: 2.6, type: 'tiles', d: 1.2 }, { t: 8.8, type: 'ding' }, { t: 12.4, type: 'clank' }, { t: 13.9, type: 'sneeze' }],
    draw(ctx, u) { anatomy(ctx, u, 's3'); },
  },

  // ------------------------------------------------------------ s4: the crossed wire (explanation)
  s4: {
    seed: 44, origin: [600, 300], capAt: 16.4, leaves: 1,
    build(pg) {
      pg.wet(rectP(-60, -60, 2520, 1500), [pale(AU.gold, .4), AU.skyLow, pale(AU.sky, .3)], { a: .35 });
      sun(pg, 330, 230, 90);
      pg.text('the crossed wire (leading theory)', 1250, 150, 64, { font: 'Caveat', weight: 600, align: 'center', at: 7.3 });
    },
    cam: (u, d) => ({ cx: lerp(1150, 1220, eio(u / d)), cy: 650, z: lerp(.8, .86, eio(u / d)) }),
    ev: [{ t: 2.4, type: 'glow' }, { t: 10.2, type: 'zap' }, { t: 16.0, type: 'drawer' }, { t: 19.5, type: 'sneeze' }],
    draw(ctx, u) { anatomy(ctx, u, 's4'); },
  },

  // ------------------------------------------------------------ s5: dark, then bright: the tunnel
  s5: {
    seed: 55, origin: [400, 600], capAt: 16.6, colorAt: .4,
    build(pg) {
      land(pg, { hz: FL - 60, bloom: [1700, 240] }); sun(pg, 880, 170, 60);
      pg.glaze([[-60, 300], [300, 240], [760, 380], [820, FL - 60], [-60, FL - 60]], AU.groundDk, { a: .5, n: 2 });
      pg.glaze([[260, FL - 60], [260, 720], [300, 600], [420, 560], [540, 600], [580, 720], [580, FL - 60]], hex('#4E4858'), { a: .78, n: 1 });
      pg.glaze([[260, FL], [580, FL], [2460, FL + 220], [2460, FL + 120], [580, FL - 60], [260, FL - 60]], pale(AU.mist, .2), { a: .35, n: 0 });
      pg.ripples(600, FL - 40, 2400, FL + 200, AU.violet, { n: 30 });
      pg.tree(1400, FL - 60, 600, { cols: [AU.gold, AU.rust] }); pg.tree(2150, FL - 60, 520, { cols: [AU.scarlet, AU.gold] });
      pg.text('dark', 420, 520, 60, { font: 'Caveat', weight: 600, align: 'center', at: 3.3 }); pg.text('bright', 1250, 330, 60, { font: 'Caveat', weight: 600, align: 'center', at: 4.0 });
    },
    cam: (u, d) => ({ cx: lerp(1050, 1250, eio(u / d)), cy: 660, z: lerp(.84, .82, eio(u / d)) }),
    ev: [{ t: 4.3, type: 'sneeze' }, { t: 11.4, type: 'sneeze' }],
    draw(ctx, u) {
      const walk = seg(u, 1.2, 4.0), x = lerp(420, 980, eio(walk));
      person(ctx, L.woman, walk > 0 && walk < 1 ? POSE.walk : POSE.stand, x, 1140, 720, u, { dir: 1, sneezes: [4.3, 11.4], face: u > 12.8 ? { eyes: 'half', look: [1, 0] } : { eyes: 'squint' }, seed: 9 });
      if (u > 13.8) { const k = popIn(u, 13.8, .4), S = []; stroke(S, [[1960, 790], [1960, 1000]], { w: 6, seed: 80 }); blob(S, rectP(1700, 560, 520, 230), PAL.sand, { a: .55, w: 2.2, seed: 81, smooth: false }); placed(ctx, S, 1960, 1000, k, 1);
        say(ctx, 'PLEASE DO NOT', 1960, 650, 56, seg(u, 14.1, 14.6), { font: 'Caveat', weight: 600, align: 'center' }); say(ctx, 'STARE AT THE SUN', 1960, 720, 56, seg(u, 14.6, 15.2), { font: 'Caveat', weight: 600, align: 'center' }); }
      if (u > 11.6) say(ctx, 'sneezes: 2', x + 150, 640, 46, seg(u, 11.7, 12.3), { font: 'Caveat', weight: 600 });
      else if (u > 4.5) say(ctx, 'sneezes: 1', x + 150, 640, 46, seg(u, 4.6, 5.1), { font: 'Caveat', weight: 600 });
    },
  },

  // ------------------------------------------------------------ s6: it runs in families: the barbecue
  s6: {
    seed: 66, origin: [1200, 600], capAt: 18.4,
    build(pg) {
      land(pg, { hz: FL - 80, bloom: [1500, 230] }); sun(pg, 1650, 200, 70);
      pg.scrub(820, FL - 70, 240, AU.scarlet); pg.tree(2280, FL - 80, 620, { cols: [AU.rust, AU.gold] });
      // chalkboard on an easel
      pg.box(150, 250, 560, 380, hex('#5A5F58'), { a: .7, cross: 6 }); pg.line([[200, 630], [160, FL - 60]], { w: 3 }); pg.line([[660, 630], [700, FL - 60]], { w: 3 });
      pg.text('dominant: 1 copy can do it', 430, 330, 40, { font: 'Caveat', weight: 600, align: 'center', at: 3.4, alpha: .9 });
      pg.text('2010 study', 430, 420, 50, { font: 'Caveat', weight: 600, align: 'center', at: 7.6 });
      pg.text('~5,000 people', 430, 500, 50, { font: 'Caveat', weight: 600, align: 'center', at: 9.9 });
      pg.text('→ chromosome 2', 430, 580, 50, { font: 'Caveat', weight: 600, align: 'center', at: 12.6 });
      // grill
      pg.glaze(ellipse(1950, 820, 130, 50, 24), hex('#4E4858'), { a: .7, n: 1 }); pg.line([[1880, 860], [1860, FL - 70]], { w: 3 }); pg.line([[2020, 860], [2040, FL - 70]], { w: 3 });
    },
    cam: (u, d) => ({ cx: lerp(1150, 1220, eio(u / d)), cy: 650, z: lerp(.8, .84, eio(u / d)) }),
    ev: [{ t: 15.2, type: 'glow' }, { t: 16.9, type: 'sneeze' }, { t: 17.0, type: 'sneeze' }],
    draw(ctx, u) {
      // chromosome with a marked spot
      if (u > 12.6) { const k = popIn(u, 12.6, .4), C = []; blob(C, [[790, 330], [830, 330], [870, 560], [830, 560]], AU.violet, { a: .5, w: 2, seed: 3 }); blob(C, [[870, 330], [830, 330], [790, 560], [830, 560]], AU.violet, { a: .5, w: 2, seed: 4 }); blob(C, ell(845, 400, 14, 10, 10), AU.scarlet, { a: .8, w: 1.6, seed: 5 }); placed(ctx, C, 830, 445, k, 1); }
      // smoke from the grill
      for (let k = 0; k < 4; k++) { const a = (u * .5 + k * .25) % 1, P = []; ctx.save(); ctx.globalAlpha = (1 - a) * .6; blob(P, ell(1950 + Math.sin(u + k) * 20, 760 - a * 300, 30 + a * 40, 20 + a * 26, 12), AU.mist, { a: .3, w: 1.2, seed: 30 + k, knockA: .1 }); draw(ctx, P); ctx.restore(); }
      const fam = [['grandma', 900, [17.0]], ['kid', 1120, [17.0]], ['woman', 1330, []], ['boss', 1560, [16.9]], ['nerd', 1760, []]];
      fam.forEach(([nm, x, sn], i) => person(ctx, L[nm], nm === 'boss' ? POSE.pockets : POSE.stand, x, 1170, nm === 'kid' ? 520 : 700, u, { dir: i < 2 ? 1 : -1, sneezes: sn, face: u > 15.3 ? { eyes: 'squint', look: [0, -1] } : { eyes: 'half', mouth: i === 2 ? 'smile' : 'flat' }, seed: 20 + i, ph: i }));
      // a cloud slides off the sun at 15
      const cx0 = lerp(1650, 2600, eio(seg(u, 14.6, 16.0))), Q = []; for (const [dx, dy, rx, ry] of [[-120, 40, 150, 80], [40, 0, 170, 110], [170, 50, 130, 75]]) blob(Q, ell(cx0 + dx, 200 + dy, rx, ry, 18), AU.mist, { a: .45, w: 1.2, seed: 40 + dx, knockA: .97 }); draw(ctx, Q);
    },
  },

  // ------------------------------------------------------------ s7: the wrong department (conclusion)
  s7: {
    seed: 77, origin: [1200, 500], capAt: 12.6, leaves: 1,
    build(pg) {
      pg.room(FL, { wall: pale(AU.gold, .55), wallA: .4, floor: AU.groundDk, floorA: .35, boards: false, stripes: 110 });
      pg.window(1820, 170, 420, 320, { curtains: false }); pg.tree(2030, 470, 260, { cols: [AU.scarlet, AU.gold], clusters: 3 });
      pg.text('BRAIN · SORTING OFFICE', 900, 140, 60, { font: 'Caveat', weight: 600, align: 'center' });
      for (const [x, lab] of [[500, 'from: EYES'], [1300, 'to: NOSE']]) { pg.glaze(rectP(x - 40, 180, 80, 560), AU.mist, { a: .5, n: 1 }); pg.text(lab, x, 790, 46, { font: 'Caveat', weight: 600, align: 'center' }); }
      pg.box(620, 820, 760, 60, AU.rust, { a: .5, cross: 6 }); pg.box(660, 880, 30, 180, AU.rust, { a: .5, cross: 4 }); pg.box(1310, 880, 30, 180, AU.rust, { a: .5, cross: 4 });
    },
    cam: (u, d) => ({ cx: lerp(1150, 1100, eio(u / d)), cy: 640, z: lerp(.8, .87, eio(u / d)) }),
    ev: [{ t: 5.6, type: 'pop' }, { t: 7.2, type: 'sigh' }, { t: 8.9, type: 'stamp' }, { t: 9.3, type: 'whoosh' }, { t: 12.8, type: 'pop' }],
    draw(ctx, u) {
      const panic = u > 7.0 && u < 9.6;
      person(ctx, L.boss, { lean: .05, armF: [u > 8.6 && u < 9.2 ? 1.6 : 1.0, .9], armB: [-.1, .3] }, 1000, 1150, 720, u, { dir: -1, shadow: false, face: panic ? { eyes: 'wide', mouth: 'o', brow: -.8 } : { eyes: 'half', mouth: 'flat' }, seed: 5 });
      // the message: drops out of the EYES tube, gets stamped, goes up the NOSE tube
      if (u > 5.4) {
        const k1 = eio(seg(u, 5.4, 6.2)), k2 = eio(seg(u, 9.1, 10.0)), x = k2 > 0 ? lerp(900, 1300, k2) : lerp(500, 900, k1), y = k2 > 0 ? lerp(800, 160, k2) : lerp(720, 800, k1);
        if (k2 < 1) { const M = []; blob(M, rectP(x - 80, y - 50, 160, 100), AU.gold, { a: .6, w: 2, seed: 8, smooth: false }); draw(ctx, M); say(ctx, 'VERY BRIGHT!', x, y + 8, 32, 1, { font: 'Caveat', weight: 600, align: 'center' });
          if (u > 8.9) say(ctx, 'NOSE', x + 30, y + 46, 34, 1, { font: 'Caveat', weight: 600, align: 'center', col: AU.scarlet, rot: -.2 }); }
      }
      // the box of tissues
      if (u > 12.8) { const k = popIn(u, 12.8, .4), T = []; blob(T, rectP(1150, 740, 170, 80), AU.mist, { a: .6, w: 2, seed: 9, smooth: false }); blob(T, [[1200, 740], [1235, 690], [1270, 740]], pale(AU.mist, .5), { a: .4, w: 1.6, seed: 10 }); placed(ctx, T, 1235, 820, k, 1); }
    },
  },

  // ------------------------------------------------------------ cta
  cta: {
    seed: 99, origin: [1200, 640], colorAt: .4, capAt: 9.0, leaves: 3,
    build(pg) {
      land(pg, { hz: FL - 60, bloom: [1500, 240] }); sun(pg, 260, 180, 60);
      pg.tree(2200, FL - 60, 560, { cols: [AU.gold, AU.scarlet] });
      pg.text('The Deadpan Why', 1160, 990, 140, { font: 'Caveat', weight: 600, at: 13.6, dur: 1.2, rot: -.02 });
    },
    cam: (u, d) => ({ cx: 1200, cy: lerp(700, 660, eio(u / d)), z: lerp(.8, .84, eio(u / d)) }),
    ev: [{ t: 4.6, type: 'pop' }, { t: 5.9, type: 'write' }, { t: 13.6, type: 'stamp' }],
    draw(ctx, u, d, h) {
      const T = h.talk(u);
      person(ctx, L.walker, { lean: .03, head: -.04, armF: [u > 4.4 ? 1.9 : .3, u > 4.4 ? .5 : .3], armB: [-.05, .2] }, 1000, 1150, 820, u, { dir: -1, face: { mouth: T > .25 ? 'talk' : 'flat', talk: T, eyes: 'half', brow: .2 }, seed: 3 });
      const k = popIn(u, 4.4, .4);
      if (k > 0) { const sg = []; stroke(sg, [[640, 560], [630, 330]], { w: 6, seed: 2 }); blob(sg, [[250, 130], [880, 110], [900, 340], [270, 360]], AU.scarlet, { a: .65, w: 2.4, seed: 3, smooth: false }); placed(ctx, sg, 575, 330, k, 1);
        ctx.save(); ctx.translate(575, 240); ctx.scale(k, k); ctx.rotate(-.03); ctx.fillStyle = 'rgba(251,248,241,.96)'; ctx.font = '112px "Patrick Hand SC"'; ctx.textAlign = 'center'; ctx.fillText('SUBSCRIBE', 0, 40); ctx.restore(); }
      if (u > 5.9) { const kb = popIn(u, 5.9, .5), cb = []; blob(cb, ell(1640, 470, 520, 240, 22), null, { w: 2.2, seed: 6, knockA: .97 }); blob(cb, [[1240, 600], [1180, 700], [1330, 640]], null, { w: 2, seed: 7, smooth: false, knockA: .97 }); placed(ctx, cb, 1600, 470, kb, kb);
        say(ctx, 'my never-stupid question:', 1640, 420, 64, seg(u, 6.4, 8), { font: 'Caveat', weight: 600, align: 'center' });
        say(ctx, 'why do leaves turn red', 1640, 500, 60, seg(u, 8.2, 9.4), { font: 'Caveat', align: 'center' }); say(ctx, 'instead of just falling?', 1640, 566, 60, seg(u, 9.5, 10.6), { font: 'Caveat', align: 'center' }); }
      const ib = []; blob(ib, [[1700, 1010], [1990, 1010], [1990, 860], [1700, 860]], AU.mist, { a: .55, w: 2.4, seed: 8, smooth: false }); draw(ctx, ib);
      say(ctx, 'QUESTIONS', 1845, 950, 44, 1, { align: 'center' });
      for (let i = 0; i < 8; i++) { const ph = (u * .5 + i * .27) % 1; if (u < 9.5 + i * .3) continue; const x = 1760 + (i * 41) % 200 + Math.sin(u * 2 + i) * 14, y = 850 - ph * 260; ctx.save(); ctx.globalAlpha = 1 - ph; draw(ctx, bigQ(x, y, .5, 40 + i)); ctx.restore(); }
    },
  },
};

// The big profile head shared by s3 (a normal sneeze) and s4 (the crossed wire). Faces left, toward the light.
function anatomy(ctx, u, which) {
  const s3 = which === 's3', tS = s3 ? 13.9 : 19.5, sn = sneeze(u, tS);
  const P = toon(L.walker, { lean: 0, head: sn?.head ?? 0, armF: [.05, .2], armB: [-.05, .15] }, 1500, 3350, 3000, { dir: -1, t: u, face: sn ? sn.face : { eyes: s3 ? 'half' : (u > 2.4 ? 'squint' : 'half'), brow: .1 }, seed: 3 });
  draw(ctx, P);
  const { c, r } = P.head, nose = [c[0] - r * 1.05, c[1] + r * .2], eye = [c[0] - r * .42, c[1] - r * .03], stem = [c[0] + r * .35, c[1] + r * .85], back = [c[0] + r * .55, c[1] - r * .1];
  const line = (pts, col, p, w = 7, dash) => { if (p <= 0) return; ctx.save(); ctx.strokeStyle = rgba(col, .85); ctx.lineWidth = w; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash); ctx.beginPath(); const n = Math.max(2, Math.floor(pts.length * clamp(p))); pts.slice(0, n).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); };
  const curve = (a, b, bend, n = 24) => [...Array(n)].map((_, i) => { const k = i / (n - 1), mx = lerp(a[0], b[0], k), my = lerp(a[1], b[1], k); return [mx + Math.sin(k * Math.PI) * bend[0], my + Math.sin(k * Math.PI) * bend[1]]; });
  const trig = curve(nose, stem, [r * .3, r * .25]), opt = curve(eye, back, [0, -r * .25]);
  const lab = (txt, x, y, t0) => say(ctx, txt, x, y, 52, seg(u, t0, t0 + .6), { font: 'Caveat', weight: 600, align: 'center' });
  // the brainstem sneeze centre with its lever
  const centre = () => { const B = []; blob(B, ell(stem[0], stem[1], 44, 34, 14), AU.gold, { a: .6, w: 2, seed: 7 }); draw(ctx, B); const lv = u > (s3 ? 12.3 : 19.2) ? -.9 : .4, B2 = []; stroke(B2, [[stem[0] + 30, stem[1] - 10], [stem[0] + 30 + Math.cos(lv) * 90, stem[1] - 10 + Math.sin(lv) * 90]], { w: 5, seed: 8 }); draw(ctx, B2); };
  if (s3) {
    // pepper drifts into the nose
    if (u > 2.4 && u < 6) { const k = seg(u, 2.4, 4.4); ctx.fillStyle = rgba(hex('#4E4858'), .8); for (let i = 0; i < 18; i++) { const sx = lerp(nose[0] - 420, nose[0] - 20, clamp(k * 1.2 - i * .02)), sy = nose[1] - 200 + i * 9 + Math.sin(u * 3 + i) * 12; ctx.beginPath(); ctx.arc(sx, sy, 3 + i % 3, 0, TAU); ctx.fill(); } }
    if (u > 2.3) { const Pp = []; blob(Pp, rectP(nose[0] - 520, nose[1] - 330, 80, 130), AU.mist, { a: .55, w: 2, seed: 11, smooth: false }); blob(Pp, ell(nose[0] - 480, nose[1] - 340, 40, 16, 10), AU.violet, { a: .5, w: 1.6, seed: 12 }); placed(ctx, Pp, nose[0] - 480, nose[1] - 270, popIn(u, 2.3, .3), 1); lab('pepper', nose[0] - 480, nose[1] - 130, 3.0); }
    line(trig, AU.gold, seg(u, 5.1, 7.7)); if (u > 5.6) lab('trigeminal nerve', c[0] - r * .3, c[1] + r * 1.25, 5.6);
    if (u > 9.4) { centre(); lab('sneeze centre', stem[0] + 160, stem[1] + 90, 9.6); }
    if (u > 17.2) lab('tens of thousands of droplets', nose[0] - 380, nose[1] + 260, 17.3);
  } else {
    line(trig, mix3(AU.gold, [255, 255, 255], .35), 1, 6);
    centre();
    if (u > 2.4) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = rgba(AU.gold, .25 * seg(u, 2.4, 3.2)); ctx.beginPath(); ctx.moveTo(330, 230); ctx.lineTo(eye[0] - 10, eye[1] - 40); ctx.lineTo(eye[0] + 10, eye[1] + 40); ctx.closePath(); ctx.fill(); ctx.restore(); }
    line(opt, hex('#6F8FB0'), seg(u, 4.0, 5.2)); if (u > 4.3) lab('optic nerve', c[0] + r * .05, c[1] - r * .55, 4.3);
    // sparks jump from the optic nerve to the trigeminal
    if (u > 9.8 && u < 14) { const m = opt[12], n = trig[14]; for (let i = 0; i < 4; i++) { const ph = (u * 3 + i * .25) % 1, zz = [...Array(6)].map((_, j) => [lerp(m[0], n[0], j / 5) + (j % 2 ? 14 : -14), lerp(m[1], n[1], j / 5) + i * 6]); line(zz, AU.scarlet, ph, 4); } lab('spill-over?', (m[0] + n[0]) / 2 + 170, (m[1] + n[1]) / 2, 10.4); }
    // the filing drawer marked NOSE
    if (u > 13.6) { const k = popIn(u, 13.6, .4), op = eio(seg(u, 15.8, 16.4)), F = [], fx = c[0] + r * 1.35, fy = c[1] - r * .45;
      blob(F, rectP(fx - 120, fy - 90, 240, 180), AU.rust, { a: .55, w: 2.2, seed: 21, smooth: false }); blob(F, rectP(fx - 100 - op * 80, fy - 20, 200, 80), pale(AU.rust, .3), { a: .55, w: 2, seed: 22, smooth: false }); placed(ctx, F, fx, fy, k, 1);
      if (k > .9) say(ctx, 'NOSE', fx - op * 80, fy + 34, 40, 1, { font: 'Caveat', weight: 600, align: 'center' });
      if (u > 14.6 && u < 16.4) { const k2 = eio(seg(u, 14.6, 16.2)), M = []; blob(M, rectP(lerp(fx + 300, fx - 80, k2) - 60, lerp(fy - 200, fy - 20, k2) - 34, 120, 68), AU.gold, { a: .6, w: 1.8, seed: 23, smooth: false }); draw(ctx, M); say(ctx, 'BRIGHT', lerp(fx + 300, fx - 80, k2), lerp(fy - 200, fy - 20, k2) + 10, 28, 1, { font: 'Caveat', weight: 600, align: 'center' }); } }
    if (u > 21.0) lab('(still not proven)', c[0] - r * .2, c[1] + r * 1.3, 21.1);
  }
  spray(ctx, P, -1, sn?.spray, 5);
}
export const ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'cta'];
