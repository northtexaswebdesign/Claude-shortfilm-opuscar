# Deadpan Style: how the demo film was made

One example among many. Don't reuse its story, arc, shots, props or timings.

**Film**: `test.mp4`, 27 s, 1920×1080 at 24 fps, no voice. Three one-panel cartoons, each ending in its caption:
1. **The regulars** (title card, then a model sheet): six characters in six poses with hand-lettered names: the clerk (slouch), the boss (hands in pockets), the woman (talk), grandma (hold), the kid (point), the nerd (shrug). Shows every row of CHANGES.md at once: nib ink, four washes, drawn faces, caption.
2. **Water cooler**: the boss gestures, talks (mouth opens on the beat), the clerk holds a paper cup, blinks once, frowns. Caption: *He did say he would circle back.* Native moves: the straight man, the caption lands. Camera: slow push, then hold.
3. **The sofa**: two people on a sofa with phones glowing, a dark television. Caption: *We should do this more often.* Native move: the caption lands. Music drops for one beat before it is written.

**Palette**: grey `#9698A0`, sea blue `#78A0BE`, sand `#E2CCA0`, rust `#C45C32`; paper `#FBF8F1`. **Score**: a lazy sunset bossa at 88 bpm in F: ukulele comping, jazz bass (Karoryfer Sneakybass), an alto sax line (Karoryfer Weresax); one beat of silence before the last caption. **Foley**: pen scratch per stroke and per caption letter, a drip and a pop.

**Which file draws what**
- `scenes.js`: the three cartoons (page build, people, props, caption cues).
- `toon.js`: the people rig. `kit.js`: the page builder and face / blob helpers. `parts.js`: popIn and placed.
- `film.js`: timeline, camera drift, caption, page turn. `common.js`: eio, seg, say, shadow.
- `mix.py`: score + foley + mix. `build.sh`: rebuild from scratch (the voice files are silent stubs that only set the scene lengths).
- `lines.json`: the three captions.

**Build notes**: scene time `u` = film time minus the scene start; the (absent) voice starts at `u = .8`. Talking is faked with a sine in `scenes.js` (`talk()`); with a real voice use `voice/words.json` as `film.js` does.
