# Foley from events.json + ambience + narration + score → out/mix.wav
import os, sys, re, json
import numpy as np, soundfile as sf, soxr
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); LIB = os.environ.get('LIB') or os.path.dirname(os.path.dirname(H))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, hp, lp, noise, env_exp, t_, brown, whoosh, thump, compress, limit
from scipy.ndimage import uniform_filter1d

rng = np.random.default_rng(11)
E = json.load(open(f'{H}/events.json')); DUR = E['dur']; N = int(DUR * SR)
src = open(f'{H}/timeline.js').read()
VO = {k: float(v) for k, v in re.findall(r'(v\d\d):\s*([\d.]+)', src.split('export const VO')[1].split('}')[0])}
SIL = (25.5, 27.0)
fx = np.zeros((N, 2)); amb = np.zeros((N, 2))

def seg(a, b, fade=.4):     # an envelope that is 1 between a and b with fades
    e = np.zeros(N); i, j = int(a * SR), int(b * SR); e[i:j] = 1
    return uniform_filter1d(e, int(fade * SR))

# ---- foley ----
def pen(d, b=0., v=1.):
    d = max(d, .05); x = bp(noise(d), 1600 + b * 1500, 7500)
    fib = np.abs(uniform_filter1d(rng.standard_normal(len(x)), 90)) * 3          # fibre texture
    x *= .5 + fib
    clicks = (rng.random(len(x)) < 120 / SR) * rng.random(len(x)) * 2.5           # paper grain
    x = x + hp(clicks, 2500)
    a = np.minimum(1, t_(d) / .015) * np.minimum(1, (d - t_(d)) / .03)
    return x * a * .05 * v
def brush(v=1.):
    d = 1.6; x = bp(noise(d), 250, 3200) * np.minimum(1, t_(d) / .18) * env_exp(d, .45); return x * .09 * v
def flick(v=1.):
    d = .08; return (hp(noise(d), 1500) * env_exp(d, .012) * .25 + bp(noise(d), 300, 900) * env_exp(d, .02) * .15) * v
def drip(v=1.):
    d = .12; tt = t_(d); f = 1400 * np.exp(-tt * 18); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .03) * .08 * v
def step(v=1.):
    d = .12; return (lp(noise(d), 500) * env_exp(d, .02) * .6 + hp(noise(d), 2000) * env_exp(d, .006) * .2) * .25 * v

for e in E['ev']:
    t, k, pan = e['t'], e['type'], e.get('pan', 0)
    if k in ('pen', 'write'):
        d = e.get('d', .3); loop = e.get('loop')
        add(fx, pen(d, e.get('b', 0) if k == 'pen' else .2, 1.3 if loop is not None and loop > 3 else 1), t, 1, pan)
    elif k == 'dab': add(fx, pen(.06, .8, .8), t - .05, 1, pan); add(fx, drip(e.get('v', .5)), t, 1, pan)
    elif k == 'bloom': add(fx, brush(e.get('v', 1)), t - .1, 1, pan)
    elif k == 'flick': add(fx, flick(), t, 1, pan)
    elif k in ('whip', 'whoosh'): add(fx, whoosh(.45, .12 * e.get('v', 1)), t, 1, pan)
# steps out of the routine, the briefcase put down
for i, t in enumerate([46.95, 47.3, 47.65]): add(fx, step(), t, 1, .2)
add(fx, thump(.18, 120), 47.95, 1, .15)

# ---- ambience ----
room = lp(brown(DUR), 500) * .012
amb += (room * seg(0, DUR, .1))[:, None]
def birds(a, b, pan):
    out = np.zeros((N, 2)); t = a
    while t < b:
        d = .07 + rng.random() * .1; tt = t_(d); f0 = 3200 + rng.random() * 1800
        f = f0 * (1 + .25 * np.sin(np.pi * tt / d * (1 + rng.random() * 2)))
        add(out, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) * .02, t, 1, pan + rng.uniform(-.4, .4))
        t += .12 + rng.random() * (.9 if rng.random() < .7 else 2.2)
    return out
amb += birds(3.4, 8.9, -.3) + birds(49.7, 59.5, .2)
breeze = bp(noise(DUR), 200, 1400); breeze *= .5 + .5 * np.sin(2 * np.pi * t_(DUR) * .23) ** 2
amb += (breeze * .02 * (seg(3.2, 9.0, .8) + seg(46.6, 60, 1.2)))[:, None]
office = lp(brown(DUR), 220) * .03; amb += (office * seg(9.1, 15.0, .3))[:, None]
sea = lp(noise(DUR), 900) * (.5 + .5 * np.sin(2 * np.pi * t_(DUR) / 3.1) ** 2) * .03; amb += (sea * seg(33.6, 36.6, .9))[:, None]     # J-cut under the wave
traffic = (lp(brown(DUR), 160) * .05 + bp(noise(DUR), 400, 1500) * .006); amb += (traffic * seg(36.4, 45.4, .6))[:, None]
# kite flutter (zone A, then zone E)
fl = bp(noise(DUR), 500, 2200) * (.4 + .6 * np.abs(np.sin(2 * np.pi * t_(DUR) * 11))) * .012
amb[:, 1] += fl * seg(3.0, 9.0, .5); amb[:, 0] += fl * seg(48.6, 60, .8)

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
music *= (.2 / rms(music)) * 10 ** (-7 / 20)                  # voice 7 dB above the music, 11 dB while ducked
env = uniform_filter1d(np.abs(voice), int(.08 * SR)); env = uniform_filter1d((env > .02).astype(float), int(.25 * SR))
music *= (1 - .4 * env)[:, None]                               # duck under the voice
fx = hp(fx.T, 90).T                                            # foley high-passed
mix = music + amb + fx * 1.0 + voice[:, None]
a, b = int(SIL[0] * SR), int(SIL[1] * SR); mix[a:b] = 0       # the silent bar
mix = np.stack([limit(mix[:, 0], .95), limit(mix[:, 1], .95)], 1)
sf.write(f'{H}/out/mix.wav', mix.astype(np.float32), SR)
print('mix', N / SR, 's peak', float(np.abs(mix).max()))
