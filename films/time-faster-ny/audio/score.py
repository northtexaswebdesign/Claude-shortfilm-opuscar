# Jazz waltz in F, 3/4 at 120 bpm (bar = 1.5 s), written to the cue map in TREATMENT.md → out/score.wav
import os, sys
import numpy as np, soundfile as sf
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); LIB = os.environ.get('LIB') or os.path.dirname(os.path.dirname(H))
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, bp, hp, lp, noise, env_exp, t_

S.seed(7)
BEAT, BAR, DUR = .5, 1.5, 60.0
bt = lambda bar, beat=0: (bar - 1) * BAR + beat * BEAT          # bar 1 starts at 0 s

CH = {   # piano comp voicing, bass root, fifth (MIDI)
    'F':  ([57, 60, 64], 41, 48), 'Dm': ([53, 57, 60], 38, 45), 'Gm': ([53, 58, 62], 43, 50), 'C7': ([52, 58, 62], 36, 43),
    'Bb': ([57, 62, 65], 34, 41), 'Am': ([55, 60, 64], 45, 40), 'D7': ([54, 60, 64], 38, 45), 'Csus': ([53, 58, 62], 36, 43),
}
# bar → chord; None = no band
PLAN = {}
for b, c in zip(range(3, 7), ['F', 'Dm', 'Gm', 'C7']): PLAN[b] = c
for b, c in zip(range(7, 11), ['F', 'Dm', 'Gm', 'C7']): PLAN[b] = c
for b, c in zip(range(11, 18), ['Bb', 'Am', 'Gm', 'C7', 'F', 'Dm', 'Csus']): PLAN[b] = c
for b, c in zip(range(19, 24), ['Dm', 'Gm', 'C7', 'F', 'Bb']): PLAN[b] = c
for b, c in zip(range(34, 41), ['F', 'Dm', 'Gm', 'C7', 'Gm', 'F', 'F']): PLAN[b] = c

ev = []
nxt_root = lambda b: CH[PLAN[b + 1]][1] if PLAN.get(b + 1) else None
for b, c in PLAN.items():
    v, root, fifth = CH[c]
    soft = .75 if 11 <= b <= 17 else .65 if 19 <= b <= 23 else 1.0
    # walking bass in three: root, fifth, approach to the next root
    nr = nxt_root(b); app = (nr + 1 if nr and nr + 1 != root else fifth + 2) if nr else fifth
    for k, n in enumerate([root, fifth, app]):
        ev.append((bt(b, k), 'jazz_bass', n, .48, (.78 if k == 0 else .62) * soft, -.1))
    # piano on beats 2 and 3 (not in the D section's first bar, not in the final bar)
    if b not in (19,) and b < 40:
        for k in (1, 2):
            for n in v: ev.append((bt(b, k), 'piano', n, .3, .42 * soft, .25))
# the last chord rings: F6/9 spread, bass F
ev += [(bt(39, 0), 'piano', n, 3.5, .5, .2) for n in [53, 57, 62, 67, 69]] + [(bt(39, 0), 'jazz_bass', 41, 3, .8, -.1)]
ev = [e for e in ev if e[0] < bt(39, 0) or e[2] in (53, 57, 62, 67, 69, 41)]

# routine: bass pedal on F, one note per bar (bars 24–31)
for b in range(24, 32): ev.append((bt(b, 0), 'jazz_bass', 41, .9, .62, -.1))

# clarinet lines: (bar, beat, note, beats)
def line(notes, vel=.55, pan=.2):
    for b, k, n, L in notes: ev.append((bt(b, k), 'clarinet', n, L * BEAT * .96, vel, pan))
line([(20, 0, 74, 1.5), (20, 1.5, 72, .5), (20, 2, 70, 1), (21, 0, 67, 2), (21, 2, 69, 1), (22, 0, 69, 3), (23, 0, 74, 1), (23, 1, 72, 1), (23, 2, 69, 1)])
line([(31, 1, 69, 4), (32, 2, 67, 3), (33, 2, 72, 1)], vel=.45)                                  # alone, near-silence
line([(34, 0, 72, 1), (34, 1, 69, 1), (34, 2, 65, 1), (35, 0, 74, 2), (35, 2, 72, 1), (36, 0, 70, 1), (36, 1, 74, 1), (36, 2, 77, 1),
      (37, 0, 76, 3), (38, 0, 74, 1), (38, 1, 72, 1), (38, 2, 70, 1), (39, 0, 69, 5)], vel=.6)

mix = S.render(ev, dur=DUR)

# brushes (synthesised): a swish per beat, a soft slap on 2 and 3; double-time in B; routine = a dry rim tick
def swish(d=.24, v=.12): x = bp(noise(d), 1800, 8000) * np.sin(np.pi * t_(d) / d) ** 1.5; return x * v
def slap(v=.18): d = .09; return hp(noise(d), 900) * env_exp(d, .018) * v
def rim(v=.2): d = .05; tt = t_(d); return (np.sin(2 * np.pi * 1750 * tt) * .6 + hp(noise(d), 3000)) * env_exp(d, .007) * v
drum = np.zeros((int(DUR * SR), 2), np.float32)
for b, c in PLAN.items():
    if b >= 40: continue
    soft = .7 if 11 <= b <= 23 else 1
    step = .5 if 7 <= b <= 10 else 1
    for k in np.arange(0, 3, step): add(drum, swish(v=.11 * soft), bt(b, k) - .05, 1, .35)
    for k in (1, 2): add(drum, slap(.16 * soft), bt(b, k), 1, .3)
for b in range(24, 31):
    for k in range(3): add(drum, rim(.2 if k == 0 else .13), bt(b, k), 1, -.3)
for b in (29, 30):                                   # the fast pan: the ticking doubles
    for k in (.5, 1.5, 2.5): add(drum, rim(.1), bt(b, k), 1, -.3)
mix[:len(drum)] += drum
mix = S.room(mix, size=.35, mix=.16)
# true silence for bar 18 (25.5–27.0 s), with a short fade into it
a, b = int(25.5 * SR), int(27.0 * SR); fade = int(.12 * SR)
mix[a - fade:a] *= np.linspace(1, 0, fade)[:, None]; mix[a:b] = 0
os.makedirs(f'{H}/out', exist_ok=True)
sf.write(f'{H}/out/score.wav', mix.astype(np.float32), SR)
print('score', mix.shape[0] / SR, 's, peak', float(np.abs(mix).max()))
print('\n'.join(S.credits(['piano', 'jazz_bass', 'clarinet'])))
