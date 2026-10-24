# Captions from the script: lines.json + voice/dur.json + VO start times in timeline.js → subs.json (page) and cues.json (srt)
import json, re, sys, os
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = json.load(open(f'{H}/lines.json')); dur = json.load(open(f'{H}/voice/dur.json'))
vo = dict(re.findall(r'(v\d\d):\s*([\d.]+)', open(f'{H}/timeline.js').read().split('export const VO')[1].split('}')[0]))
MAX = 64
cues = []
for l in lines:
    t0, d, text = float(vo[l['id']]), dur[l['id']], l['text']
    parts = re.findall(r'[^.?!]+[.?!]*', text); parts = [p.strip() for p in parts if p.strip()]
    chunks = [' '.join(parts)]
    if len(chunks[0]) > MAX:                     # split once, at the sentence boundary nearest the middle
        best = min(range(1, len(parts)), key=lambda k: abs(len(' '.join(parts[:k])) - len(' '.join(parts[k:]))))
        chunks = [' '.join(parts[:best]), ' '.join(parts[best:])]
    tot = sum(len(c) for c in chunks); t = t0
    for i, c in enumerate(chunks):
        span = d * len(c) / tot
        cues.append({'t0': round(t, 3), 'end': round(t + span, 3), 'text': c}); t += span
for i, c in enumerate(cues):                      # hold ≥ max(1.8 s, speech + .6 s), never past the next cue
    want = max(c['t0'] + 1.8, c['end'] + .6)
    nxt = cues[i + 1]['t0'] - .05 if i + 1 < len(cues) else 1e9
    c['t1'] = round(min(want, nxt), 3)
    if c['t1'] - c['t0'] < 1.8 or c['t1'] < c['end'] + .3: print('WARN short cue', c, file=sys.stderr)
cues.append({'t0': round(cues[-1]['t1'] + .1, 3), 'end': 59.9, 't1': 59.9, 'text': 'Why time feels faster as you get older.'})
json.dump([{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in cues], open(f'{H}/subs.json', 'w'), indent=1)
print(len(cues), 'cues')
# .srt: narration only
json.dump([{'t0': c['t0'], 't1': c['t1'], 'text': c['text']} for c in cues[:-1]], open(f'{H}/cues.json', 'w'), indent=1)
