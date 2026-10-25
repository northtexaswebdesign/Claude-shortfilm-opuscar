"""Why Is the Sky Blue but Sunsets Red? — voice + score + foley + mix.
Run from the library root:  python films/baby-memory/mix.py   (needs events.json from core/render/events.mjs and the freepats + karoryfer samples)
Score: solo nylon guitar (fingerpicked 3/4 lullaby in D), walking jazz bass from the turn (s3), kalimba sparkle, ukulele for the family scene,
one bar of true silence before 'you just lost the password' (s6). Foley: pen on paper, paper turns, pops, stamps, switches, a printing till."""
import json, os, sys
import numpy as np, soundfile as sf, soxr
LIB = os.environ.get('LIB', os.getcwd()); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio import sfx
from core.audio.sfx import SR, add, bp, hp, lp, noise, brown, compress, limit

HERE = os.path.dirname(os.path.abspath(__file__)); VOICE = os.path.join(HERE, 'voice')
ev = json.load(open(os.path.join(HERE, 'events.json'))); DUR = ev['dur']; EV = ev['ev']
dur = json.load(open(os.path.join(VOICE, 'dur.json')))
ORDER = ['s1', 's2', 's3']; TITLE, LEAD, TAIL = 3.5, .8, 1.4
start, t = {'title': 0.0}, TITLE
for i in ORDER: start[i] = t; t += LEAD + dur[i] + TAIL
N = int(DUR * SR) + SR
R = np.random.default_rng(5)
S.seed(5)

# ---------------------------------------------------------------- voice
voice = np.zeros((N, 2))
for i in ORDER:
    a, sr = sf.read(os.path.join(VOICE, i + '.wav'))
    a = soxr.resample(a, sr, SR); a = compress(a)
    k = int((start[i] + LEAD) * SR); voice[k:k + len(a), 0] += a; voice[k:k + len(a), 1] += a
voice *= .9 / max(1e-6, np.abs(voice).max())

# ---------------------------------------------------------------- score
# A slow sunset bossa at 88 bpm in F: ukulele comping, soft jazz bass, a lazy alto sax line, glass shimmer on the blue moments.
BEAT = 60 / 88; BAR = 4 * BEAT
CH = {'F': (41, [57, 60, 64, 69]), 'Dm': (38, [57, 62, 65, 69]), 'Bb': (46, [58, 62, 65, 70]), 'C': (48, [55, 60, 64, 67])}
PROG = ['F', 'Dm', 'Bb', 'C']
LINE = {'F': [72, 69, 67], 'Dm': [74, 72, 69], 'Bb': [70, 72, 74], 'C': [72, 67, 64]}
sections = [('title', 1, 0, 0), ('s1', 1, 1, 0), ('s2', 1, 1, 1), ('s3', 1, 1, 1)]
secs = {s[0]: s for s in sections}
sec_end = {k: (start[k] + (TITLE if k == 'title' else LEAD + dur[k] + TAIL)) for k in secs}
sec_end['s3'] = DUR
MW = [(start['s3'] + 5.0, start['s3'] + 5.9, .0)]
def gain_at(tm):
    g = 1.0
    for a, b, k in MW:
        if a <= tm < b: g = min(g, k)
    return g
events = []
bar_i = 0; tm = 0.0
while tm < DUR - .5:
    name = next(k for k in secs if start[k] <= tm < sec_end[k]) if tm < DUR else 'cta'
    _, uk, bass, sax = secs[name]
    ch = PROG[bar_i % 4]; root, tones = CH[ch]; gm = gain_at(tm)
    if gm > 0:
        for b, off in ((0, 0), (1.5, 0), (3, 0)):
            for p in tones[:3]: events.append((tm + (b + off) * BEAT + R.normal(0, .006), 'ukulele', p, BEAT * .7, (.34 + .05 * R.random()) * gm, .25, .55))
        if bass: events += [(tm, 'jazz_bass', root, BEAT * 1.8, .5 * gm, -.3, .7), (tm + 2 * BEAT, 'jazz_bass', root + 7, BEAT * 1.6, .42 * gm, -.3, .7)]
        if sax and bar_i % 2 == 0:
            for i, p in enumerate(LINE[ch]): events.append((tm + (i * 1.3 + .5) * BEAT, 'alto_sax', p - 12, BEAT * 1.6, .4 * gm, .1, .6))
        pass
    tm += BAR; bar_i += 1
for p in (41, 53, 57, 60, 64): events.append((start['s3'] + dur['s3'] + .9 + (p - 41) * .02, 'ukulele', p + 12, 3.0, .5, 0, .7))
music = S.render([e for e in events if e[0] < DUR], dur=DUR + 3, master=False)
music = S.room(music, size=.3, mix=.15)
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
for e in EV:
    t0, ty = e['t'], e.get('type')
    if ty == 'pen': put(scratch(e.get('d', 3), 14, .05), t0, 1, R.uniform(-.2, .2))
    elif ty == 'write': put(scratch(e.get('d', 1), 9, .05), t0, 1, .15)
    elif ty == 'page': put(bp(noise(.5), 500, 4500) * np.hanning(int(.5 * SR)) * .1, max(0, t0 - .3), 1, 0); put(sfx.whoosh(.4, .25), max(0, t0 - .3), 1, 0)
    elif ty == 'pop': put(sfx.pop(.6), t0, 1, R.uniform(-.3, .3))
    elif ty == 'ding': put(sfx.ding(.5), t0, 1, .1)
    elif ty == 'glow': put(sfx.ding(.4), t0, 1, .2)
    elif ty == 'whoosh': put(sfx.whoosh(.6, .6), t0, 1, 0)
    elif ty == 'sigh': put(sfx.whoosh(.9, .3), t0, 1, 0)
    elif ty == 'stamp': put(sfx.thump(.9, 80), t0, 1, 0); put(sfx.clack(1.0, .6), t0, 1, 0)
    elif ty == 'switch': put(sfx.click(.7, 1.0), t0, 1, -.3); put(sfx.thump(.4, 120), t0 + .02, 1, -.3)
    elif ty == 'crash': put(sfx.crash(.35), t0, 1, .2)
    elif ty == 'clank': put(sfx.clack(.6, .8), t0, 1, .4); put(sfx.click(.5, .6), t0 + .08, 1, .4)
    elif ty == 'drip': [put(sfx.pop(.35), t0 + k * .22, 1, R.uniform(-.4, .4)) for k in range(6)]
    elif ty == 'receipt': [put(sfx.click(1.4 + R.random() * .5, .35), t0 + k * .09, 1, -.1) for k in range(int(2.9 / .09))]
    elif ty == 'hush': pass
# paper room tone under everything
room = lp(brown(DUR + 1), 600) * .12
fol[: len(room), 0] += room[:N]; fol[: len(room), 1] += room[:N]

# ---------------------------------------------------------------- mix
def smooth(x, k):
    c = np.cumsum(np.concatenate([np.zeros(k), x, np.full(k, x[-1])])); return ((c[2 * k:] - c[:-2 * k]) / (2 * k))[:len(x)]
env = smooth(np.abs(voice[:, 0]), SR // 10)
duck = smooth(np.where(env > .01, .30, .62), SR // 4)
# true silence: the whole bed drops in the s6 window
sil = np.ones(N)
a, b = int((start['s3'] + 5.1) * SR), int((start['s3'] + 5.8) * SR); sil[a:b] = 0; sil = smooth(sil, int(.08 * SR))
fade = np.minimum(1, np.minimum(np.arange(N) / SR / 1.0, (N - np.arange(N)) / SR / 2.0))
out = voice + (music * duck[:, None] * .55 + fol * .9 * (1 if True else 0)) * (sil * fade)[:, None]
out = limit(out) if out.ndim == 2 else out
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), out[: int(DUR * SR)], SR)
print('mix', round(DUR, 2), 'peak', round(float(np.abs(out).max()), 3))
S_ = [e[1] for e in events]; print('instruments used:', sorted(set(S_)))
