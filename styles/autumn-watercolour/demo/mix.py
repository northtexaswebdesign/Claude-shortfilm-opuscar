"""Why Do We Sneeze at the Sun? — voice + score + foley + mix.
Run from the library root:  python films/sun-sneeze/mix.py   (needs events.json from core/render/events.mjs)
Score (new for the channel): an autumn Celtic slow jig in 6/8, D major: modelled harp arpeggios and steel-string guitar strums
(core/audio/pluck.py), a muted conga as a soft bodhran pulse, a whisper of bagpipe drone on the hillside scenes.
The bed drops out for a beat before "You're not allergic to sunshine" in the conclusion.
Foley: pen and caption scratch, page turns, pops, synthesised sneezes, a door creak, nerve sparks, a filing drawer."""
import json, os, sys
import numpy as np, soundfile as sf, soxr
sys.path.insert(0, os.getcwd())
from core.audio import sampler as S
from core.audio import sfx
from core.audio.sfx import SR, add, bp, hp, lp, noise, brown, compress, limit, t_

HERE = sys.argv[1] if len(sys.argv) > 1 else os.path.join('films', 'sun-sneeze'); VOICE = os.path.join(HERE, 'voice')
ev = json.load(open(os.path.join(HERE, 'events.json'))); DUR = ev['dur']; EV = ev['ev']
dur = json.load(open(os.path.join(VOICE, 'dur.json')))
ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'cta']; TITLE, LEAD, TAIL = 3.5, .8, 1.4
start, t = {'title': 0.0}, TITLE
for i in ORDER: start[i] = t; t += LEAD + dur[i] + TAIL
N = int(DUR * SR) + SR
R = np.random.default_rng(7)
S.seed(7)

# ---------------------------------------------------------------- voice
voice = np.zeros((N, 2))
for i in ORDER:
    a, sr = sf.read(os.path.join(VOICE, i + '.wav'))
    a = soxr.resample(a, sr, SR); a = compress(a)
    k = int((start[i] + LEAD) * SR); voice[k:k + len(a), 0] += a; voice[k:k + len(a), 1] += a
voice *= .9 / max(1e-6, np.abs(voice).max())

# ---------------------------------------------------------------- score
# Autumn Celtic slow jig (new for the channel): 6/8 at 96 bpm (dotted-quarter pulse) in D. Modelled harp arpeggios and steel-string
# guitar strums (core/audio/pluck.py), a muted conga as a soft bodhran pulse, a whisper of bagpipe drone on the hillside scenes.
from core.audio import pluck as PL
Q8 = 60 / 96 / 3 * 2 / 2   # one eighth note in 6/8 at 96 dotted-quarter bpm
BAR = 6 * Q8
CH = {'D': (38, [62, 66, 69, 74]), 'G': (43, [62, 67, 71, 74]), 'A': (45, [61, 64, 69, 73]), 'Bm': (47, [62, 66, 71, 74])}
PROG = ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D']
ARP = [0, 1, 2, 3, 2, 1]
# section: (harp, guitar, drum, drone)
SEC = {'title': (1, 0, 0, 1), 's1': (1, 1, 1, 0), 's2': (1, 1, 1, 1), 's3': (1, 0, 0, 0), 's4': (1, 0, 1, 0),
       's5': (1, 1, 1, 0), 's6': (1, 1, 1, 1), 's7': (1, 1, 0, 0), 'cta': (1, 1, 1, 0)}
sec_end = {k: (start[k] + (TITLE if k == 'title' else LEAD + dur[k] + TAIL)) for k in SEC}; sec_end['cta'] = DUR
def section(tm): return next((k for k in SEC if start[k] <= tm < sec_end[k]), 'cta')
pl = np.zeros((N + 4 * SR, 2)); events = []
def pk(preset, p, at, d, vel, g, pan): add(pl, PL.pluck(preset, p, d, vel=vel), at, g, pan)
bar_i = 0; tm = 0.0
while tm < DUR - 2.5:
    name = section(tm); harp, gtr, drum, drone = SEC[name]
    ch = PROG[bar_i % 8]; root, tones = CH[ch]
    pk('harp', root, tm, BAR * 1.2, .7, .9, -.2)
    if harp:
        for i, k in enumerate(ARP): pk('harp', tones[k] + (12 if i in (3,) else 0), tm + i * Q8 + R.normal(0, .004), 1.4, .45 + .12 * (i % 3 == 0), .6, .25)
    if gtr:
        for b in (0, 3): add(pl, PL.strum('acoustic_guitar', [root + 12, tones[0], tones[1], tones[2]], 1.2, vel=.45, spread=.022, up=b == 3), tm + b * Q8, .45, -.15)
    if drum:
        for b, v in ((0, .55), (2, .25), (3, .4), (5, .25)): events.append((tm + b * Q8, 'world_perc', 'muted_low_conga', Q8, v, .1, .45))
    if drone and bar_i % 2 == 0: events.append({'t': tm, 'inst': 'bagpipe', 'pitch': 50, 'dur': BAR * 2, 'vel': .3, 'pan': 0, 'gain': .08, 'attack': .8})
    tm += BAR; bar_i += 1
end = start['cta'] + dur['cta'] + 1.0
pk('harp', 38, end, 3, .9, 1, -.2); add(pl, PL.strum('harp', [50, 57, 62, 66, 69, 74], 3.0, vel=.6, spread=.06), end, .8, .2)
music = S.render([e for e in events if (e[0] if isinstance(e, tuple) else e['t']) < DUR], dur=DUR + 3, master=False)
if len(music) < len(pl): music = np.pad(music, ((0, len(pl) - len(music)), (0, 0)))
music = music[:len(pl)] / max(1e-6, np.abs(music).max()) * .45 + pl / max(1e-6, np.abs(pl).max())
music = S.room(music, size=.45, mix=.2)
if len(music) < N: music = np.pad(music, ((0, N - len(music)), (0, 0)))
music = music[:N]; music /= max(1e-6, np.abs(music).max())

# ---------------------------------------------------------------- foley
fol = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0): add(fol, x, at, g, pan)
def scratch(d, rate, g):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(d * rate)):
        a = R.integers(0, max(1, n - 2000)); L = int(R.uniform(.03, .14) * SR); b = bp(noise(L / SR), 1600, 7500) * np.hanning(L) * R.uniform(.3, 1)
        x[a:a + len(b)] += b[: n - a]
    x *= 1 + .5 * np.sin(np.arange(n) / SR * 40)
    return x * g
def buzz(d, f=200, g=.05):
    tt = t_(d); ph = 2 * np.pi * np.cumsum(f * (1 + .04 * np.sin(2 * np.pi * 5.5 * tt) + .02 * R.standard_normal(len(tt)).cumsum() / np.sqrt(len(tt)))) / SR
    x = sum(np.sin(ph * k) / k for k in range(1, 9)) * (.7 + .3 * np.sin(2 * np.pi * 23 * tt))
    env = np.minimum(1, np.minimum(tt / .25, (d - tt) / .4)); return bp(x, 150, 3500) * env * g
def whine(d, g=.03): return buzz(d, 620, g)
def sneeze_sfx(g=.12):
    a = bp(noise(.55), 700, 2600) * np.linspace(0, 1, int(round(.55 * SR))) ** 2 * .25          # the 'ah-ah' intake
    b = bp(noise(.32), 1200, 7000) * np.exp(-t_(.32) / .07)                                     # the 'choo'
    x = np.concatenate([a, np.zeros(int(.05 * SR)), b]); return x * g / max(1e-6, np.abs(x).max())
for e in EV:
    t0, ty = e['t'], e.get('type')
    if ty == 'pen': put(scratch(e.get('d', 3), 14, .05), t0, 1, R.uniform(-.2, .2))
    elif ty == 'write': put(scratch(e.get('d', 1), 9, .05), t0, 1, .15)
    elif ty == 'page': put(bp(noise(.5), 500, 4500) * np.hanning(int(.5 * SR)) * .1, max(0, t0 - .3), 1, 0); put(sfx.whoosh(.4, .25), max(0, t0 - .3), 1, 0)
    elif ty == 'pop': put(sfx.pop(.6), t0, 1, R.uniform(-.3, .3))
    elif ty == 'ding': put(sfx.ding(.5), t0, 1, .1)
    elif ty == 'glow': put(sfx.ding(.4), t0, 1, .2)
    elif ty == 'sigh': put(sfx.whoosh(.9, .25), t0, 1, -.2)
    elif ty == 'swish': put(sfx.whoosh(.25, .7), t0, 1, .1)
    elif ty == 'stamp': put(sfx.thump(.9, 80), t0, 1, 0); put(sfx.clack(1.0, .6), t0, 1, 0)
    elif ty == 'buzz': put(buzz(e.get('d', 2)), t0, 1, R.uniform(-.4, .4))
    elif ty == 'sneeze': put(sneeze_sfx(), t0 - .6, 1, R.uniform(-.2, .2))
    elif ty == 'creak': put(sfx.creak(.5), t0, 1, -.4)
    elif ty == 'zap': [put(sfx.click(2.2, .25), t0 + k * .05, 1, .2) for k in range(8)]
    elif ty == 'drawer': put(sfx.whoosh(.3, .3), t0, 1, .3); put(sfx.thump(.4, 140), t0 + .3, 1, .3)
    elif ty == 'clank': put(sfx.clack(.6, .8), t0, 1, .2)
    elif ty == 'whoosh': put(sfx.whoosh(.5, .5), t0, 1, .2)
    elif ty == 'whine': put(whine(e.get('d', 2)), t0, 1, .35)
    elif ty == 'tiles': [put(sfx.click(1.6 + R.random() * .6, .3), t0 + k * .06, 1, R.uniform(-.4, .4)) for k in range(int(e.get('d', 1) / .06))]
room = lp(brown(DUR + 1), 600) * .12
fol[: len(room), 0] += room[:N]; fol[: len(room), 1] += room[:N]

# ---------------------------------------------------------------- mix
def smooth(x, k):
    c = np.cumsum(np.concatenate([np.zeros(k), x, np.full(k, x[-1])])); return ((c[2 * k:] - c[:-2 * k]) / (2 * k))[:len(x)]
env = smooth(np.abs(voice[:, 0]), SR // 10)
duck = smooth(np.where(env > .01, .30, .62), SR // 4)
sil = np.ones(N)
a, b = int((start['s7'] + 11.6) * SR), int((start['s7'] + 12.4) * SR); sil[a:b] = 0; sil = smooth(sil, int(.08 * SR))
fade = np.minimum(1, np.minimum(np.arange(N) / SR / 1.0, (N - np.arange(N)) / SR / 2.0))
out = voice + (music * (duck * sil)[:, None] * .55 + fol * .9) * fade[:, None]
out = np.stack([limit(out[:, c], ceil=.55) for c in (0, 1)], 1)   # limit() is 1-D: per channel
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out[: int(DUR * SR)], SR)
print('mix', round(DUR, 2), 'peak', round(float(np.abs(out).max()), 3))
print('instruments used:', sorted(set(e[1] if isinstance(e, tuple) else e['inst'] for e in events)) + ['harp, acoustic_guitar (pluck.py)'])
