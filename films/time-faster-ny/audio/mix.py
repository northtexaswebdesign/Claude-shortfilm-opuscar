# Foley from events.json + ambience per panel + narration + score → out/mix.wav
import os, sys, re, json
import numpy as np, soundfile as sf, soxr
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); LIB = os.environ.get('LIB') or os.path.dirname(os.path.dirname(H))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, hp, lp, noise, env_exp, t_, brown, whoosh, thump, ding, creak, compress, limit
from scipy.ndimage import uniform_filter1d

rng = np.random.default_rng(12)
E = json.load(open(f'{H}/events.json')); DUR = E['dur']; N = int(DUR * SR)
src = open(f'{H}/timeline.js').read()
VO = {k: float(v) for k, v in re.findall(r'(v\d\d):\s*([\d.]+)', src.split('export const VO')[1].split('}')[0])}
SIL = (25.5, 27.0)
fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def seg(a, b, fade=.3):
    e = np.zeros(N); i, j = int(a * SR), int(b * SR); e[i:j] = 1
    return uniform_filter1d(e, max(1, int(fade * SR)))
T = t_(DUR)

# ---- foley ----
def slide():                    # a sheet of paper sliding across paper
    d = .5; x = bp(noise(d), 700, 5000) * np.sin(np.pi * t_(d) / d) ** 1.4; return x * .05
def scratch(d):                 # the caption being lettered: a light nib scratch per letter group
    d = max(d, .1); x = bp(noise(d), 2500, 8000) * (.4 + np.abs(uniform_filter1d(rng.standard_normal(int(round(d * SR))), 300)) * 4)
    return x * np.minimum(1, t_(d) / .02) * np.minimum(1, (d - t_(d)) / .05) * .012
def puff():
    d = .45; return bp(noise(d), 200, 2500) * np.minimum(1, t_(d) / .04) * env_exp(d, .12) * .12
def clink():
    d = .6; tt = t_(d); return sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(2950, .5, .12), (4410, .3, .08), (6200, .2, .05)]) * .05
def step(v=1.):
    d = .12; return (lp(noise(d), 500) * env_exp(d, .02) * .6 + hp(noise(d), 2000) * env_exp(d, .006) * .2) * .22 * v
for e in E['ev']:
    t, k = e['t'], e['type']
    if k == 'slide': add(fx, slide(), t, 1, .2)
    elif k == 'write': add(fx, scratch(e.get('d', .8)), t, 1, 0)
    elif k == 'puff': add(fx, puff(), t, 1, .1)
    elif k == 'clink': add(fx, clink(), t, 1, .3)
    elif k == 'step': [add(fx, step(), t + i * .32, 1, -.2) for i in range(3)]
    elif k == 'tap': add(fx, thump(.12, 160), t, 1, .2); add(fx, thump(.08, 220), t + .18, 1, .2)
    elif k == 'creak': add(fx, creak(.05), t, 1, -.1)
# museum footsteps and a cough in a big room; the guard's snore
for t in (28.0, 28.45, 28.9): add(fx, step(.6), t, 1, .5)
def snore(d=1.1):
    x = lp(noise(d), 300) * (.5 + .5 * np.sin(2 * np.pi * 28 * t_(d))) * np.sin(np.pi * t_(d) / d) ** 2; return x * .06
for t in (43.2, 45.0): add(fx, snore(), t, 1, -.3)

# ---- ambience ----
amb += (lp(brown(DUR), 500) * .01)[:, None]                                       # paper room tone
waves = lp(noise(DUR), 1100) * (.35 + .65 * np.sin(2 * np.pi * T / 4.2) ** 4) * .05
amb += (waves * (seg(0, 9.0, .3) + seg(47.8, 51.0, .4)))[:, None]
def gulls(a, b):
    out = np.zeros((N, 2)); t = a
    while t < b:
        d = .35; tt = t_(d); f = 1500 * (1 + .5 * np.sin(np.pi * tt / d)) * (1 - .3 * tt / d)
        add(out, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * .012, t, 1, rng.uniform(-.6, .6)); t += 1.4 + rng.random() * 2
    return out
amb += gulls(1.0, 8.6) + gulls(48.2, 50.8)
fl = bp(noise(DUR), 500, 2200) * (.4 + .6 * np.abs(np.sin(2 * np.pi * T * 11))) * .008
amb[:, 1] += fl * (seg(1, 9, .4) + seg(48, 51, .4))
room = lp(brown(DUR), 250) * .02; amb += (room * (seg(9, 25.5, .2)))[:, None]
hall = lp(brown(DUR), 180) * .025 + bp(noise(DUR), 300, 900) * .002; amb += (hall * (seg(27, 36.6, .3) + seg(42, 46.5, .3) + seg(51, 60, .5)))[:, None]
traffic = lp(brown(DUR), 160) * .05 + bp(noise(DUR), 400, 1500) * .006; amb += (traffic * (seg(36.6, 42, .3) + seg(46.5, 48.3, .3)))[:, None]

# ---- narration ----
voice = np.zeros(N)
for k, t0 in VO.items():
    x, sr = sf.read(f'{H}/voice/{k}.wav', dtype='float64')
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); i = int(t0 * SR); voice[i:i + len(x)] += x[:N - i]
voice = hp(voice, 80); voice = compress(voice, thr=.12, ratio=3.5)

# ---- score + balance ----
music, sr = sf.read(f'{H}/out/score.wav', dtype='float64'); assert sr == SR
music = music[:N] if len(music) >= N else np.pad(music, ((0, N - len(music)), (0, 0)))
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2))
voice *= .2 / rms(voice)
music *= (.2 / rms(music)) * 10 ** (-7 / 20)
env = uniform_filter1d(np.abs(voice), int(.08 * SR)); env = uniform_filter1d((env > .02).astype(float), int(.25 * SR))
music *= (1 - .4 * env)[:, None]
fx = hp(fx.T, 90).T
mix = music + amb + fx + voice[:, None]
a, b = int(SIL[0] * SR), int(SIL[1] * SR); mix[a:b] = 0
mix = np.stack([limit(mix[:, 0], .95), limit(mix[:, 1], .95)], 1)
sf.write(f'{H}/out/mix.wav', mix.astype(np.float32), SR)
print('mix', N / SR, 's peak', float(np.abs(mix).max()))
