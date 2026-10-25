// Deadpan Style: demo film. Three one-panel cartoons, each with one hand-lettered deadpan caption.
import { clamp, lerp, ss, TAU, hex, rgba, INK } from './engine.js';
import { PAL, blob, stroke, ell, pale } from './kit.js';
import { popIn, placed, drawPrims } from './parts.js';
import { toon, LOOKS, POSE } from './toon.js';
import { eio, seg, shadowAt, say } from './common.js';
const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const talk = (u, a, b, r = 9) => (u > a && u < b) ? .55 + .45 * Math.sin(u * r) : 0;
const FL = 1040;

export const SCENES = {
  title: {
    seed: 3, origin: [1200, 560], speed: 1100, colorAt: .8,
    build(pg) {
      pg.flat(ell(1200, 600, 1100, 500, 28), PAL.sand, .16);
      pg.text('New Yorker Cartoon', 1200, 520, 150, { font: 'Caveat', weight: 600, align: 'center', dur: 1.2, alpha: .95 });
      pg.text('ink & wash', 1200, 690, 150, { font: 'Caveat', weight: 600, align: 'center', dur: 1.0, alpha: .95, t: 1.2 });
      pg.text('a style of The Deadpan Why', 1200, 790, 56, { font: '"Reenie Beanie"', align: 'center', dur: 1.0, t: 2 });
    },
    cam: (u, d) => ({ cx: 1200, cy: 640, z: .8 + .05 * ss(u / d) }),
    draw(ctx, u) { },
  },

  // ------------------------------------------------------------ s1: the regulars (a model sheet)
  s1: {
    seed: 5, origin: [1200, 700],
    build(pg) {
      pg.flat([[-40, FL], [2440, FL], [2440, 1400], [-40, 1400]], PAL.floor, .28); pg.line([[-30, FL], [2430, FL + 4]], { w: 2.6 });
      pg.flat(ell(1200, 560, 1150, 520, 28), pale(PAL.sand, .5), .3);
      const names = ['the clerk', 'the boss', 'the woman', 'grandma', 'the kid', 'the nerd'];
      names.forEach((n, i) => pg.text(n, 250 + i * 380, 1190, 50, { font: 'Caveat', weight: 600, align: 'center', at: 2.6 + i * .35, dur: .6 }));
    },
    cam: (u, d) => ({ cx: 1200, cy: 675, z: .8 + .03 * eio(u / d) }),
    ev: [{ t: 1.5, type: 'pop' }, { t: 2.6, type: 'write' }],
    draw(ctx, u, d) {
      const cast = [['clerk', 'slouch', 1, { mouth: 'flat' }], ['boss', 'pockets', -1, { mouth: 'frown', brow: .5 }], ['woman', 'talk', 1, { mouth: u % 2 > 1 ? 'talk' : 'smile', talk: .8 }], ['grandma', 'hold', -1, { mouth: 'smirk', brow: -.3 }], ['kid', 'point', 1, { mouth: 'o', eyes: 'wide' }], ['nerd', 'shrug', -1, { mouth: 'smirk', brow: -.5 }]];
      cast.forEach(([nm, pose, dir, face], i) => { const x = 250 + i * 380, k = popIn(u, 1.0 + i * .25, .4); const S = nm === 'kid' ? 520 : nm === 'grandma' ? 640 : 720; shadowAt(ctx, x, 1130, 120);
        const pr = toon(LOOKS[nm], pose, x, 1130, S, { dir, t: u + i, face, seed: i + 1 }); placed(ctx, pr, x, 1130, k, k); });
    },
  },

  // ------------------------------------------------------------ s2: office, water cooler
  s2: {
    seed: 22, origin: [1200, 600],
    build(pg) {
      pg.room(FL, { wall: pale(PAL.blue, .55), wallA: .35, floor: PAL.grey, floorA: .3, boards: false });
      pg.window(1620, 160, 460, 360, { curtains: false }); pg.clock(1000, 230, 70); pg.frame(300, 150, 300, 200, PAL.sand);
      // water cooler
      pg.box(1180, 640, 150, 400, PAL.white, { a: .45, cross: 5 }); pg.oval(1255, 540, 80, 110, PAL.blue, { a: .35, w: 3 }); pg.box(1215, 700, 80, 36, PAL.blue, { a: .5, cross: 3 });
      pg.plant(2220, FL, 1.1);
    },
    cam: (u, d) => { const k = eio(u / d); return { cx: lerp(1200, 1240, k), cy: lerp(700, 660, k), z: lerp(.8, .88, k) }; },
    ev: [{ t: 3.5, type: 'pop' }, { t: 5.2, type: 'drip' }, { t: 7.0, type: 'sigh' }],
    draw(ctx, u, d) {
      const t0 = 1.2;
      shadowAt(ctx, 800, 1140, 200); shadowAt(ctx, 1700, 1140, 200);
      const boss = toon(LOOKS.boss, { lean: .06, armF: [.9 + .35 * Math.sin(u * 4), 1.0], armB: [-.05, .2] }, 800, 1140, 760, { dir: 1, t: u, face: { mouth: talk(u, t0, 6, 10) > .2 ? 'talk' : 'smile', talk: talk(u, t0, 6, 10), brow: .3, eyes: 'open' }, seed: 2 });
      const clerk = toon(LOOKS.clerk, { lean: .13, head: .1, armF: [.55, 1.35], armB: [-.04, .1] }, 1700, 1140, 720, { dir: -1, t: u, face: { mouth: u > 5 ? 'frown' : 'flat', eyes: u > 2.4 && u < 3.0 ? 'closed' : 'half', brow: u > 5 ? -.5 : 0 }, seed: 3 });
      drawPrims(ctx, boss, { color: 1, ink: 1 }); drawPrims(ctx, clerk, { color: 1, ink: 1 });
      // the paper cup in the clerk's hand
      const [hx, hy] = clerk.hands[0]; const cup = []; blob(cup, [[hx - 24, hy - 40], [hx + 24, hy - 40], [hx + 17, hy + 20], [hx - 17, hy + 20]], PAL.white, { a: .85, w: 2.4, seed: 5, smooth: false }); drawPrims(ctx, cup, { color: 1, ink: 1 });
    },
  },

  // ------------------------------------------------------------ s3: two people, one sofa, two phones
  s3: {
    seed: 33, origin: [1200, 640],
    build(pg) {
      pg.room(FL, { wall: pale(PAL.sand, .35), wallA: .45, floor: PAL.floor, floorA: .3, boards: false, stripes: 90 });
      pg.frame(700, 170, 300, 220, PAL.blue); pg.lamp(1900, 90, 0); pg.shelf(260, 600, 380);
      // sofa in profile facing right, and a dark television
      pg.box(520, 760, 820, 280, PAL.rust, { a: .45, cross: 6 }); pg.box(480, 560, 120, 480, PAL.rust, { a: .55, cross: 6 }); pg.box(520, 720, 820, 60, PAL.rust, { a: .5, cross: 5 });
      pg.box(1700, 700, 480, 330, PAL.grey, { a: .5, cross: 6 }); pg.box(1730, 730, 420, 270, PAL.dark, { a: .55, cross: 4 }); pg.box(1860, 1040, 160, 30, PAL.sand, { a: .5, cross: 4 });
    },
    cam: (u, d) => { const k = eio(u / d); return { cx: lerp(1200, 1150, k), cy: lerp(690, 660, k), z: lerp(.8, .9, k) }; },
    ev: [{ t: 3.0, type: 'switch' }, { t: 5.8, type: 'sigh' }],
    draw(ctx, u, d) {
      const seat = 760;
      shadowAt(ctx, 880, 1075, 360);
      const a = toon(LOOKS.grandma, { sit: true, lean: .16, head: .22, armF: [.3, 1.5], armB: [.1, 1.2] }, 700, FL + 30, 700, { dir: 1, t: u, face: { mouth: 'flat', eyes: 'half', brow: .2, look: [.4, .9] }, seed: 4 });
      const b = toon(LOOKS.nerd, { sit: true, lean: .12, head: .26, armF: [.3, 1.5], armB: [.1, 1.3] }, 1040, FL + 30, 700, { dir: 1, t: u + 1, face: { mouth: u > 4 ? 'smirk' : 'flat', eyes: 'half', look: [.3, .9] }, seed: 5 });
      drawPrims(ctx, a, { color: 1, ink: 1 }); drawPrims(ctx, b, { color: 1, ink: 1 });
      for (const pr of [a, b]) { const [hx, hy] = pr.hands[0]; const ph = []; blob(ph, [[hx - 14, hy - 40], [hx + 20, hy - 40], [hx + 20, hy + 24], [hx - 14, hy + 24]], PAL.dark, { a: .8, w: 2.4, seed: 8, smooth: false }); drawPrims(ctx, ph, { color: 1, ink: 1 }); ctx.save(); ctx.fillStyle = rgba(hex('#DCEBFF'), .55 + .15 * Math.sin(u * 3)); ctx.beginPath(); ctx.moveTo(hx + 20, hy - 30); ctx.lineTo(hx + 120, hy - 110); ctx.lineTo(hx + 120, hy + 40); ctx.lineTo(hx + 20, hy + 14); ctx.fill(); ctx.restore(); }
    },
  },
};
export const ORDER = ['s1', 's2', 's3'];
