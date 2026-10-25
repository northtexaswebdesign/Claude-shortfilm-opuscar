// toon.js: Deadpan Style cartoon people. A 2D rig (not the 3D skeleton): big heads, big noses, slouch, hands that talk, deadpan half-lidded eyes.
// toon(look, pose, x, y, S) -> primitives for drawPrims. (x, y) = floor point between the feet, S = standing height in px.
import { clamp, lerp, TAU, hex, rgba, INK } from './engine.js';
import { PAL, blob, stroke, ell, boil } from './kit.js';

export const POSE = {
  stand:   { lean: .02, armF: [.05, .2], armB: [-.05, .15] },
  slouch:  { lean: .16, head: .12, armF: [.02, .1], armB: [-.04, .1], knee: .5 },
  pockets: { lean: .1, head: .06, armF: [.22, -.6, 'pocket'], armB: [.1, -.5, 'pocket'] },
  point:   { lean: .06, armF: [1.35, .1], armB: [-.05, .15] },
  shrug:   { lean: 0, head: -.1, armF: [.7, 1.2], armB: [.7, 1.2], lift: .03 },
  talk:    { lean: .06, armF: [.9, 1.0], armB: [-.05, .15] },
  hold:    { lean: .04, armF: [.55, 1.25], armB: [.1, .3] },
  fold:    { lean: .05, armF: [.45, 1.9, 'fold'], armB: [.35, 1.9, 'fold'] },
  sit:     { lean: .08, sit: true, armF: [.2, 1.1], armB: [.05, .9] },
  walk:    { lean: .06, armF: [.5, .3], armB: [-.5, .2], walk: true },
};
export const LOOKS = {
  clerk:   { skin: hex('#F0C9AC'), top: hex('#8FA8BF'), bottom: hex('#9698A0'), hair: hex('#5B4636'), hairStyle: 'parted', tie: hex('#C45C32'), nose: 1.35, bags: 1, shoe: hex('#4A4952') },
  boss:    { skin: hex('#EBC3A5'), top: hex('#4C5464'), bottom: hex('#4C5464'), hair: hex('#B9B4AE'), hairStyle: 'bald', moustache: 1, nose: 1.6, glasses: 1, tie: hex('#C45C32'), belly: 1.35, shoe: hex('#34333A'), suit: 1 },
  woman:   { skin: hex('#F2D0B6'), top: hex('#C45C32'), bottom: hex('#E2CCA0'), hair: hex('#3A2C28'), hairStyle: 'bob', dress: 1, nose: 1.0, lashes: 1, shoe: hex('#4A4952') },
  grandma: { skin: hex('#F0CDB2'), top: hex('#78A0BE'), bottom: hex('#78A0BE'), hair: hex('#D9D6D0'), hairStyle: 'bun', dress: 1, glasses: 1, nose: 1.2, bags: 1, shoe: hex('#6A5A50') },
  kid:     { skin: hex('#F2CDB2'), top: hex('#E2CCA0'), bottom: hex('#78A0BE'), hair: hex('#7A4A33'), hairStyle: 'tuft', nose: .6, headK: 1.18, legK: .8, shoe: hex('#C45C32') },
  nerd:    { skin: hex('#D9A383'), top: hex('#E9E4D8'), bottom: hex('#5B5A63'), hair: hex('#2E2420'), hairStyle: 'curly', glasses: 1, nose: 1.1, bags: 1, shoe: hex('#34333A') },
};

const D = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function ik2(a, t, l1, l2, bend) {   // two-bone IK in the plane; bend = +1 / -1 picks which side the middle joint falls
  let d = D(a, t); const mx = l1 + l2 - .5; if (d > mx) { t = [a[0] + (t[0] - a[0]) * mx / d, a[1] + (t[1] - a[1]) * mx / d]; d = mx; }
  const ang = Math.atan2(t[1] - a[1], t[0] - a[0]), c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), a1 = Math.acos(c) * bend;
  return [[a[0] + Math.cos(ang + a1) * l1, a[1] + Math.sin(ang + a1) * l1], t];
}
function tube(P, a, b, r0, r1, col, o = {}) {   // tapered organic limb between two points
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
  blob(P, [[a[0] - ux * r0 * .5 + nx * r0, a[1] - uy * r0 * .5 + ny * r0], [b[0] + nx * r1, b[1] + ny * r1], [b[0] + ux * r1 * .9, b[1] + uy * r1 * .9], [b[0] - nx * r1, b[1] - ny * r1], [a[0] - ux * r0 * .5 - nx * r0, a[1] - uy * r0 * .5 - ny * r0]], col, { a: o.a ?? .55, w: o.w ?? 2.4, seed: o.seed ?? 3, smooth: true, knock: o.knock ?? true });
}
function limb(P, pts, rad, col, o = {}) {   // one smooth outline through several joints, tapering
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; L.push([pts[i][0] + nx * rad[i], pts[i][1] + ny * rad[i]]); Rr.push([pts[i][0] - nx * rad[i], pts[i][1] - ny * rad[i]]); }
  const e = pts[n - 1], p = pts[n - 2], dx = e[0] - p[0], dy = e[1] - p[1], l = Math.hypot(dx, dy) || 1, cap = [e[0] + dx / l * rad[n - 1] * .95, e[1] + dy / l * rad[n - 1] * .95];
  const s0 = pts[0], s1 = pts[1], sx = s0[0] - s1[0], sy = s0[1] - s1[1], sl = Math.hypot(sx, sy) || 1, top = [s0[0] + sx / sl * rad[0] * .6, s0[1] + sy / sl * rad[0] * .6];
  blob(P, [top, ...L, cap, ...Rr.reverse()], col, { a: o.a ?? .55, w: o.w ?? 2.4, seed: o.seed ?? 3, smooth: true, knock: true });
}
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---- the head ----
function head(P, c, r, d, tilt, look, e, sd) {
  const yaw = e.yaw ?? .85, lw = Math.max(1.6, r * .03), hk = look.headK ?? 1;
  const rx = r * hk, ry = r * hk * 1.04, rot = tilt * d;
  const R = (x, y) => [c[0] + (x * Math.cos(rot) - y * Math.sin(rot)) * d * 1, c[1] + (x * Math.sin(rot) * d + y * Math.cos(rot))];   // x in head units, + toward the face
  // back of the head, hair behind
  const hs = look.hairStyle ?? 'parted', hair = look.hair;
  if (hs === 'long' || hs === 'bob') blob(P, [R(-rx * 1.1, -ry * .3), R(-rx * 1.05, ry * (hs === 'long' ? 1.6 : .75)), R(rx * .1, ry * (hs === 'long' ? 1.5 : .8)), R(rx * .2, ry * .2)], hair, { a: .75, w: lw, seed: sd + 1, smooth: true });
  if (hs === 'bun') blob(P, ell(...R(-rx * .95, -ry * 1.05), rx * .42, rx * .42, 12), hair, { a: .7, w: lw, seed: sd + 2 });
  // skull and jaw
  const skull = [R(-rx, -ry * .1), R(-rx * .75, -ry * .85), R(0, -ry * 1.05), R(rx * .75, -ry * .8), R(rx * 1.02, -ry * .15), R(rx * .98, ry * .35), R(rx * .6, ry * .9), R(0, ry * 1.02), R(-rx * .7, ry * .7)];
  blob(P, skull, look.skin, { a: .5, w: lw * 1.2, seed: sd + 3, smooth: true });
  // ear
  blob(P, ell(...R(-rx * .22, ry * .08), rx * .09, ry * .15, 10, rot), look.skin, { a: .5, w: lw * .8, seed: sd + 4, knock: false });
  // hair on top
  if (hs === 'parted') { blob(P, [R(-rx * 1.04, ry * .15), R(-rx * .95, -ry * .8), R(-rx * .1, -ry * 1.2), R(rx * .8, -ry * .95), R(rx * .55, -ry * .62), R(rx * .1, -ry * .78), R(-rx * .4, -ry * .5)], hair, { a: .75, w: lw, seed: sd + 5, smooth: true, knock: false }); stroke(P, [[R(rx * .1, -ry * .78)[0], R(rx * .1, -ry * .78)[1]], R(-rx * .1, -ry * 1.12)], { w: lw * .8, seed: sd + 6 }); }
  if (hs === 'bob') blob(P, [R(-rx * 1.1, ry * .75), R(-rx * 1.05, -ry * .6), R(-rx * .2, -ry * 1.2), R(rx * .85, -ry * .9), R(rx * .75, -ry * .55), R(rx * .25, -ry * .7), R(-rx * .35, -ry * .2), R(-rx * .35, ry * .75)], hair, { a: .8, w: lw, seed: sd + 5, smooth: true, knock: false });
  if (hs === 'bun') blob(P, [R(-rx * 1.04, ry * .1), R(-rx * .9, -ry * .85), R(-rx * .05, -ry * 1.15), R(rx * .8, -ry * .8), R(rx * .45, -ry * .55), R(-rx * .35, -ry * .4)], hair, { a: .8, w: lw, seed: sd + 5, smooth: true, knock: false });
  if (hs === 'tuft') { blob(P, [R(-rx * .7, -ry * .85), R(-rx * .1, -ry * 1.5), R(rx * .35, -ry * 1.05), R(rx * .7, -ry * .85)], hair, { a: .8, w: lw, seed: sd + 5, smooth: false, knock: false }); }
  if (hs === 'curly') for (let k = 0; k < 7; k++) { const a = -Math.PI * 1.02 + k / 6 * Math.PI * .78; blob(P, ell(...R(Math.cos(a) * rx * .95, Math.sin(a) * ry * 1.0), rx * .26, rx * .26, 8), hair, { a: .8, w: lw * .9, seed: sd + 9 + k, knock: false }); }
  if (hs === 'bald') { stroke(P, [R(-rx * .95, -ry * .2), R(-rx * .98, -ry * .5)], { w: lw * .9, seed: sd + 5 }); stroke(P, [R(-rx * .98, -ry * .1), R(-rx * 1.12, -ry * .3)], { w: lw * .9, seed: sd + 6 }); }
  // nose: a big bump out of the face edge
  const nk = (look.nose ?? 1) * (e.nose ?? 1), nx0 = rx * .98, ny0 = -ry * .05;
  blob(P, [R(nx0, ny0 - ry * .1), R(nx0 + rx * .38 * nk, ny0 + ry * .22), R(nx0 + rx * .28 * nk, ny0 + ry * .36), R(nx0 - rx * .05, ny0 + ry * .34)], look.skin, { a: .55, w: lw * 1.1, seed: sd + 20, smooth: true, knock: true });
  // eyes: half-lidded by default (deadpan)
  const eyes = [[.46, -.12], [.08, -.12]]; if (yaw > .8) eyes.pop();
  const lookx = (e.look ?? [.5, 0]);
  eyes.forEach(([ex, ey], i) => {
    const [px, py] = R(rx * ex, ry * ey), er = r * .13 * (e.eyes === 'wide' ? 1.35 : 1);
    if (e.eyes === 'closed') { stroke(P, [R(rx * ex - er / 1, ry * ey), R(rx * ex, ry * ey + er * .6), R(rx * ex + er, ry * ey)], { w: lw, seed: sd + 30 + i }); }
    else {
      blob(P, ell(px, py, er * 1.05, er * (e.eyes === 'wide' ? 1.05 : .8), 10), hex('#F8F5EE'), { a: .85, w: lw * .9, seed: sd + 30 + i, knock: true });
      P.push({ k: 'fn', fn: c2 => { c2.fillStyle = rgba(INK, .95); c2.beginPath(); c2.arc(px + lookx[0] * er * .5 * d, py + lookx[1] * er * .4 + er * .05, er * .46, 0, TAU); c2.fill(); } });
      if (e.eyes !== 'wide') { const lidY = e.eyes === 'half' || e.eyes === undefined ? -er * .05 : -er * .55; P.push({ k: 'fn', fn: c2 => { c2.save(); c2.fillStyle = rgba(look.skin, .95); c2.beginPath(); c2.ellipse(px, py - er * .85 + lidY * 0 + (e.eyes === 'squint' ? er * .5 : 0), er * 1.12, er * (e.eyes === 'squint' ? .95 : .75) + (e.eyes === 'half' || e.eyes === undefined ? er * .3 : 0), 0, 0, TAU); c2.fill(); c2.restore(); } }); stroke(P, [[px - er * 1.05, py - er * .1 + (e.eyes === 'squint' ? er * .2 : 0)], [px + er * 1.05, py - er * .1 + (e.eyes === 'squint' ? er * .2 : 0)]], { w: lw * 1.2, seed: sd + 36 + i }); }
    }
    if (look.bags) stroke(P, [R(rx * ex - er, ry * ey + er * 1.5), R(rx * ex, ry * ey + er * 1.9), R(rx * ex + er, ry * ey + er * 1.5)], { w: lw * .7, seed: sd + 40 + i, alpha: .7 });
    if (look.lashes) stroke(P, [R(rx * ex + er * 1.0, ry * ey - er * .2), R(rx * ex + er * 1.5, ry * ey - er * .7)], { w: lw, seed: sd + 44 + i });
    const b = e.brow ?? 0, by = ry * (ey - .26); stroke(P, [R(rx * ex - er * 1.2, by + (b < 0 ? -b * ry * .08 : -b * ry * .03)), R(rx * ex + er * 1.2, by + (b < 0 ? b * ry * .02 : b * ry * .09))], { w: lw * 1.5, seed: sd + 48 + i });
  });
  // glasses
  if (look.glasses) { for (const [ex, ey] of eyes) blob(P, ell(...R(rx * ex, ry * ey), r * .2, r * .18, 12), null, { w: lw * .95, seed: sd + 52, knock: false }); if (eyes.length > 1) stroke(P, [R(rx * eyes[1][0] + r * .2, ry * eyes[1][1]), R(rx * eyes[0][0] - r * .2, ry * eyes[0][1])], { w: lw * .8, seed: sd + 53 }); stroke(P, [R(rx * eyes[eyes.length - 1][0] - r * .2, ry * eyes[0][1]), R(-rx * .25, ry * -.1)], { w: lw * .8, seed: sd + 54 }); }
  // mouth
  const m = e.mouth ?? 'flat', tk = e.talk ?? 0, mx = rx * .5, my = ry * .55, mw = rx * .3;
  if (look.moustache) blob(P, [R(mx - mw * 1.1, my - ry * .12), R(mx + mw * 1.5, my - ry * .14), R(mx + mw * 1.3, my - ry * .02), R(mx, my - ry * .06)], look.hair, { a: .75, w: lw, seed: sd + 60, smooth: true, knock: false });
  if (m === 'flat') stroke(P, [R(mx - mw, my), R(mx + mw, my + ry * .02)], { w: lw * 1.2, seed: sd + 61 });
  else if (m === 'smirk') stroke(P, [R(mx - mw, my + ry * .02), R(mx + mw * .4, my + ry * .02), R(mx + mw * 1.1, my - ry * .06)], { w: lw * 1.2, seed: sd + 61 });
  else if (m === 'smile') stroke(P, [R(mx - mw, my - ry * .04), R(mx + mw * .1, my + ry * .1), R(mx + mw * 1.1, my - ry * .06)], { w: lw * 1.2, seed: sd + 61 });
  else if (m === 'frown') stroke(P, [R(mx - mw, my + ry * .07), R(mx + mw * .1, my - ry * .03), R(mx + mw * 1.1, my + ry * .06)], { w: lw * 1.2, seed: sd + 61 });
  else if (m === 'o') blob(P, ell(...R(mx + mw * .4, my + ry * .04), rx * .13, ry * .17, 10), PAL.rust, { a: .5, w: lw, seed: sd + 61 });
  else if (m === 'grin') blob(P, [R(mx - mw, my - ry * .03), R(mx + mw * 1.2, my - ry * .06), R(mx + mw * .5, my + ry * .17)], hex('#F4F1EA'), { a: .7, w: lw, seed: sd + 61, smooth: true });
  else blob(P, ell(...R(mx + mw * .3, my + ry * .04), mw * .9, ry * (.04 + .12 * tk), 10), PAL.rust, { a: .5, w: lw, seed: sd + 61 });   // talk
  // chin line and neck shadow
  stroke(P, [R(rx * .15, ry * .92), R(rx * .62, ry * .86)], { w: lw * .7, seed: sd + 65, alpha: .5 });
  return c;
}

// ---- the person ----
export function toon(look, pose, x, y, S, o = {}) {
  const P = [], d = o.dir ?? 1, sd = (o.seed ?? 1) * 17, t = o.t ?? 0, e = o.face ?? {};
  const p = typeof pose === 'string' ? POSE[pose] : pose, lw = Math.max(1.6, S * .0028);
  const headR = S * .125 * (look.headK ?? 1), legK = look.legK ?? 1;
  const legL = S * .45 * legK, T = legL * .5, Sh = legL * .5;
  const breathe = Math.sin(t * 2.2) * S * .004, boilJ = () => (Math.random() - .5) * 0;
  let hipY = y - legL * (p.sit ? .52 : .97) - (p.walk ? Math.abs(Math.sin(t * 7)) * S * .02 : 0);
  const hip = [x - (p.sit ? d * S * .02 : 0), hipY];
  const lean = (p.lean ?? .05) + (o.lean ?? 0) + Math.sin(t * 1.3) * .006;
  const torsoL = S * .31 * (look.coat ? 1 : 1), neck = [hip[0] + d * Math.sin(lean) * torsoL, hip[1] - Math.cos(lean) * torsoL + breathe];
  const tilt = (p.head ?? 0) + (o.tilt ?? 0), hc = [neck[0] + d * Math.sin(lean + tilt * .7) * (headR * 1.05 + S * .02), neck[1] - Math.cos(lean + tilt * .7) * (headR * 1.05 + S * .02)];
  const ax = [(neck[0] - hip[0]) / torsoL, (neck[1] - hip[1]) / torsoL], pp = [-ax[1] * d, ax[0] * d];   // pp: unit vector toward the front of the body
  const wH = S * .082, wW = S * .074 * (look.belly ?? 1), wS = S * .08, belly = look.belly ?? 1;
  const topC = look.top, botC = look.bottom ?? look.top, shade = c => mixc(c, [110, 118, 160], .28);
  // legs
  const leg = (side) => {
    const hp = [hip[0] + side * d * S * .015, hip[1]];
    let foot;
    if (p.sit) foot = [hp[0] + d * (S * .27 - side * S * .04), y - S * .03 + side * 2];
    else if (p.walk) { const ph = Math.sin(t * 7 + (side > 0 ? 0 : Math.PI)), st = S * .1 * ph, lift = Math.max(0, Math.cos(t * 7 + (side > 0 ? 0 : Math.PI))) * S * .04; foot = [x + d * st + side * d * 4, y - lift]; }
    else foot = [x + d * (side > 0 ? S * .035 : -S * .03) + (p.stance ?? 0) * d * side * S, y];
    const [knee, f] = ik2(hp, foot, T, Sh, -d);
    return { hp, knee, f };
  };
  const lb = leg(-1), lf = leg(1);
  const drawLeg = (L, back) => {
    const cl = back ? shade(botC) : botC;
    if (look.dress && !p.sit) { limb(P, [L.knee, [(L.knee[0] + L.f[0]) / 2, (L.knee[1] + L.f[1]) / 2], L.f], [S * .027, S * .02, S * .017], look.skin, { w: lw * .9, seed: sd + 70 }); }
    else limb(P, [L.hp, L.knee, L.f], [S * .052, S * .04, S * .028], cl, { w: lw, seed: sd + 71 });
    blob(P, [[L.f[0] - d * S * .03, L.f[1] - S * .04], [L.f[0] + d * S * .01, L.f[1] - S * .045], [L.f[0] + d * S * .085, L.f[1] - S * .008], [L.f[0] + d * S * .08, L.f[1] + S * .012], [L.f[0] - d * S * .035, L.f[1] + S * .012]], look.shoe ?? PAL.dark, { a: .8, w: lw, seed: sd + 73, smooth: true });
  };
  // arms
  const shoulder = [neck[0] - ax[0] * S * .03 + pp[0] * 0, neck[1] - ax[1] * S * .03];
  const arm = (cfg, back) => {
    const [a1, e1, mode] = cfg, U = S * .165, F = S * .15, sA = a1 + (p.lift ? 0 : 0) + (o.arm ?? 0) * (back ? 0 : 1);
    const el = [shoulder[0] + d * Math.sin(sA) * U, shoulder[1] + Math.cos(sA) * U - (p.lift ?? 0) * S], fa = sA + e1;
    const hand = mode === 'pocket' ? [hip[0] + d * S * .03, hip[1] + S * .01] : [el[0] + d * Math.sin(fa) * F, el[1] + Math.cos(fa) * F];
    const sl = look.suit || look.dress || look.sleeve === 'none' ? (look.sleeve === 'none' ? look.skin : topC) : topC, cl = back ? shade(sl) : sl;
    limb(P, [shoulder, el, hand], [S * .034, S * .028, S * .02], cl, { w: lw, seed: sd + 80 + (back ? 3 : 0) });
    if (mode !== 'pocket') { blob(P, ell(hand[0] + d * S * .008, hand[1] + S * .012, S * .024, S * .03, 9), look.skin, { a: .55, w: lw * .9, seed: sd + 84 + (back ? 3 : 0) }); stroke(P, [[hand[0] + d * S * .012, hand[1]], [hand[0] + d * S * .035, hand[1] + S * .02]], { w: lw * .8, seed: sd + 86 }); }
    return hand;
  };
  // draw order: back arm, back leg, front leg, torso, head, front arm
  const handB = arm(p.armB ?? [0, .2], true);
  drawLeg(lb, true); drawLeg(lf, false);
  // torso
  const fr = (a, w, k = 1) => [a[0] + pp[0] * w * k, a[1] + pp[1] * w * k], bk = (a, w) => [a[0] - pp[0] * w, a[1] - pp[1] * w];
  const hemY = look.dress ? S * .22 : (look.coat ? S * .12 : 0), ext = [hip[0] - ax[0] * 0, hip[1] - ax[1] * 0];
  const torso = [bk(neck, wS * .7), bk(shoulder, wS * .9), bk([hip[0] + ax[0] * S * .1, hip[1] + ax[1] * S * .1], wW * .85), bk(hip, wH * .95), fr(hip, wH * 1.1 * belly), fr([hip[0] + ax[0] * S * .1, hip[1] + ax[1] * S * .1], wW * 1.15 * belly), fr(shoulder, wS * .9), fr(neck, wS * .55)];
  if (look.dress && !p.sit) { const sk = [bk(hip, wH), fr(hip, wH * 1.2), [hip[0] + d * S * .11, hip[1] + S * .24], [hip[0] - d * S * .1, hip[1] + S * .24]]; blob(P, sk, look.bottom ?? topC, { a: .55, w: lw, seed: sd + 90, smooth: true, knock: true }); }
  if (look.dress && p.sit) { const sk = [bk(hip, wH), fr(hip, wH * 1.2), [hip[0] + d * S * .22, hip[1] + S * .05], [hip[0] + d * S * .2, hip[1] + S * .12], [hip[0] - d * S * .03, hip[1] + S * .1]]; blob(P, sk, look.bottom ?? topC, { a: .55, w: lw, seed: sd + 90, smooth: true }); }
  blob(P, torso, topC, { a: .55, w: lw * 1.1, seed: sd + 91, smooth: true });
  if (look.tie) { const tp = [neck[0] + ax[0] * -S * .01 + pp[0] * wS * .5, neck[1] - ax[1] * S * .01 + pp[1] * wS * .5], tb = [tp[0] - ax[0] * S * .16 + pp[0] * S * .015, tp[1] - ax[1] * S * .16 + pp[1] * S * .015]; blob(P, [tp, [tp[0] + d * S * .014, tp[1] + S * .02], [tb[0] + d * S * .026, tb[1]], [tb[0], tb[1] + S * .02], [tb[0] - d * S * .014, tb[1]], [tp[0] - d * S * .01, tp[1] + S * .02]], look.tie, { a: .75, w: lw * .9, seed: sd + 92, smooth: false, knock: false }); }
  if (look.suit) stroke(P, [fr(neck, wS * .35), fr([hip[0] + ax[0] * S * .05, hip[1] + ax[1] * S * .05], wW * 1.1 * belly)], { w: lw, seed: sd + 93, alpha: .8 });
  stroke(P, [neck, [neck[0] + (hc[0] - neck[0]) * .6, neck[1] + (hc[1] - neck[1]) * .6]], { w: S * .03, seed: sd + 94, alpha: .0 });
  // neck
  blob(P, [fr(neck, S * .03), fr([hc[0], hc[1] + headR * .6], S * .035), bk([hc[0], hc[1] + headR * .6], S * .03), bk(neck, S * .03)], look.skin, { a: .55, w: lw, seed: sd + 95, smooth: true });
  head(P, hc, headR, d, tilt, look, e, sd + 100);
  const handF = arm(p.armF ?? [.05, .2], false);
  P.hands = [handF, handB]; P.head = { c: hc, r: headR }; P.hip = hip;
  return P;
}
