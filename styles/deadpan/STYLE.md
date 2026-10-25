# Deadpan Style — Style Prompt

Based on Urban Sketch · Pen & Wash (urban-sketch) from Lemo-Opuscar. Formerly "New Yorker Cartoon · Ink & Wash"; the house style of The Deadpan Why channel.

> A single-panel magazine cartoon, drawn in nib ink with a few pale washes on warm paper, and one deadpan caption lettered by hand beneath it. The drawing holds still; only the living things wobble. The joke is in the face and the caption, never in the effects.
> References (grammar only):
> - The New Yorker cartoonists of the Thurber / Steig / Sempé school: loose expressive people, big noses, tired eyes, one line of caption.
> - *Annie Hall* (1977), the animated sequence: a world sketched in ink and wash, characters that talk to the viewer.
> - Jazz waltz and trio jazz (the Vince Guaraldi school): a walking bass, a woodwind, brushes.
>
> Nothing is copied from these: no characters, jokes, layouts or type.

## 1. Essence, and what it is not

A cartoon that thinks. Two layers that stay visibly separate:

1. **Ink.** A nib line that swells and thins, from a hairline (about 1/1000 of the frame width) to a confident stroke (about 1/300). Warm black. It wobbles, overshoots corners, and breaks mid-stroke.
2. **Wash.** Four pale watercolours only, dropped slightly off the line: **grey** `#9698A0`, **sea blue** `#78A0BE`, **sand** `#E2CCA0`, **rust** `#C45C32`, and mixes of them with paper. Never saturated.

**The page is warm paper `#FBF8F1`** with fine tooth, fading to white at the frame edge. Nothing is painted edge to edge.

**People are the subject.** Drawn faces with a big nose, half-lidded or wide eyes, a tilted head, a slouch, hands that talk. A character has an attitude before it has an action.

**One caption**, hand-lettered, about 1/30 of the frame height, written letter by letter under the drawing, and it stays. It is dry, short and never explains the picture.

Not Urban Sketch (that is a travel sketchbook: no characters with faces, no caption, many colours). Not a cartoon in the animation sense (no bouncing, no squash, no smears). Not Whiteboard (no marker, no diagrams without a joke). Avoid saturated colour, uniform vector lines, and a small framed panel on a big blank page.

## 2. Materials & rendering

- **Paper**: `#FBF8F1`, two octaves of mottling, a tooth tile multiplied over everything (figures too), a soft fade to white at the frame edge.
- **Ink**: the library's `penStroke` with a nib: width swells in the middle of a stroke and thins at the ends; about 1/1000 to 1/300 of the frame width; wobble about 1 px, overshoot 3–8 px, a gap in a third of long strokes. Strokes bake their draw time, so the page draws itself.
- **Wash**: two to three layers, multiply, alpha 0.4–0.6, offset 3–5 px from the line, dried edge at 30–40 %. Washes arrive from a point (a wet front), people are lit with a knocked-out paper white first so the wash never muddies the face.
- **People**: the 2D cartoon rig `demo/toon.js` (see §10): a nib outline round each shape, one wash, no shading except a cool-grey on the back arm and back leg. Figures are redrawn every frame with fresh wobble seeds (they **boil** at 12 fps); the page behind them does not.
- **Rooms and props**: a few strokes, not a rendering: a floor line, a skirting line, vertical stripes for wallpaper at 45 % alpha, one window, one lamp. Put a prop in only if the joke or the mood needs it.
- Deterministic: same seed, same marks.

## 3. Colour logic

- Ink is one colour (warm black `#221F1C`); it never changes.
- The washes are the four above, used pale. Skin is sand mixed toward rust; hair is one of grey/sand/rust/dark grey; clothes are one of the four, one per person, so a pair of people read apart in one glance.
- **Paper white is the brightest value**: highlights are left unpainted. Windows, mugs and paper are paper.
- A scene may take one accent (rust) for the thing the eye should land on: a tie, a sign, a cup.
- Night is the sea-blue wash mixed toward grey over the whole page; stars are ink.

## 4. Type & subtitles

- **One caption per drawing**, lettered by hand: Patrick Hand SC at about 1/30 of frame height, centered under the picture, written left to right with pen sound. It sits on a soft paper-coloured halo and holds until the page turns.
- **Other writing is on the page**: labels and signs in Caveat (500–600), a margin note or the channel mark in Reenie Beanie.
- A voice-over has no subtitle strip: the caption is the only text, and the narration is not repeated word for word.
- Hold the caption ≥ max(2 s, writing time + 1.5 s).

## 5. Motion quality

- **The drawing holds still; living things wobble.** People re-seed their line at 12 fps. The page does not boil.
- **Acting is small**: a slow blink, a head tilt, one hand lifting, a mouth opening on stress words. No bounce, no squash.
- **The camera drifts**: a slow push of a few percent over the whole scene and a tiny sway; never a jolt.
- **Page turns**: the old page washes out to paper, then the next page draws itself.
- Colour never snaps; it arrives from a point.

## 6. Camera grammar

A 2D camera over a 2400 × 1350 page, shown whole at about 0.8× so the edge fade is visible. Moves are slow and eased.

| Move | What it expresses | Can serve |
|---|---|---|
| Slow push-in (3–10 %) | attention gathering | every scene, by default |
| Drift sideways | a glance moving | a conversation between two |
| Hold, then push on the punchline | the beat before the joke | the last seconds before the caption lands |
| Pull back | the whole absurd situation | a closing wide of the room |
| Page turn | another day, another cartoon | a sequence of single-panel cartoons |
| Tilt into the caption | from picture to words | the moment the caption writes itself |

Framing: people at least ⅓ of frame height; leave air above and below; a character may look out of frame. No dissolves, no whips.

## 7. Sound palette

- **Room tone** of paper, then the place when it has colour (an office hum, a kettle, rain).
- **Pen on paper**: band-passed noise, one burst per stroke; the caption's letters get their own scratch.
- **Foley at cartoon scale**: a cup set down, a chair, a phone buzz, a switch, a pop for a prop arriving.
- **Music families**: a jazz trio (walking bass, brushes, a lazy sax or clarinet); solo nylon guitar; a ukulele bossa; a café accordion. One colour instrument per scene.
- **Silence is the punchline's setup**: drop the bed for a beat before the caption lands.
- **Mix**: music ducks under speech; foley high-passed; −14 LUFS.

## 8. Native moves

- **The caption lands.** The drawing is already finished; after a held beat the caption is written, letter by letter, and the scene ends one breath later. *Fits content like:* any single joke.
- **The straight man.** One half-lidded, still character beside one who gestures; the camera pushes in on the still one. *Fits content like:* a meeting, a doctor's office, a dinner.
- **The deadpan turn.** A character slowly looks at us. *Fits content like:* the moment after something absurd happens.
- **The cutaway page.** A thought or a memory drawn as a pale cloud on the page, without a frame. *Fits content like:* a character imagining what they cannot say.

## 9. Pitfalls of the medium

- **A heavy outline on every shape** makes people look like stickers → keep the head line at about 3 % of the head radius and let limbs be thinner than the head.
- **Ears that read as eyes** → keep ears small and set back; eyes sit near the front of the face.
- **Tube limbs that show joints** → draw each limb as one outline through its joints (`limb` in `toon.js`), not two sticks.
- **Faces with the same expression** read as clones → vary brow and mouth per character and per beat; keep the eyes half-lidded for deadpan and open only for a surprise.
- **Hair covering the face** (curls, bobs) → build hair in the back half of the head only.
- **A caption that explains the picture** kills the joke → it should add one thing the picture does not say.
- **Last letters cut off** by a glyph-width clip in cursive fonts → widen the clip for the last character of every handwritten string (done in `kit.js`).
- **Rooms that are too complete** → fewer lines, wash dropped off-register, plenty of paper.
- **Panels in a corner of the frame** → the drawing fills the page, it is not a small framed panel.

## 10. Engine

`demo/engine.js` (deterministic; copied from the library's Urban Sketch engine and changed): `penStroke` with a nib-width swell, `rasterPen`, `wash`, `reserve`, `arrivalField`, `compositor` (paper × wash revealed by arrival × ink revealed by stroke time), `drawPrims`, `handwrite`. `demo/kit.js`: the page builder (`makePage`: room, window, frame, table, chair, plant, clock, lamp, shelf; text written at a time) and the living-thing helpers (`blob`, `stroke`, `ell`, `face`, `bubble`). **`demo/toon.js`: the cartoon-people rig**: `toon(look, pose, x, y, S, { dir, t, face, seed })` with six ready characters (`LOOKS`: clerk, boss, woman, grandma, kid, nerd) and ten poses (`POSE`: stand, slouch, pockets, point, shrug, talk, hold, fold, sit, walk). Face options: `mouth` flat / smirk / smile / frown / o / grin / talk; `eyes` half (default) / open / wide / closed / squint; `brow` −1…1; `look` [x, y]. `demo/film.js`: timeline, camera drift, caption, page turns. `demo/mix.py`: score, foley, mix. Technique base: [`../urban-sketch/demo/`](../urban-sketch/demo/) (read its [`DEMO.md`](../urban-sketch/DEMO.md)).

## 11. Variation space

You decide the cartoon's situation, the cast, the room, whether there is a voice, the music family, the camera path, the opening, the ending and the length. A film is usually several cartoons, one caption each, or one cartoon that develops.

All far from our demo:

- Structures: **an explainer in cartoons** (each fact is one panel with its own caption); **one long dinner** drawn from three angles, the same table, the joke arriving late; **a day in an office** told by the clock on the wall.
- Openings: **the blank paper** and a hand-lettered title; **a close-up of one tired eye** pulling back to the room; **rain on a window** and a person looking out.
- Endings: **the caption writes itself and the page goes white**; **a character leaves the frame** and the room stays; **the last panel repeats the first with one thing changed**.

---

How our demo was made (story, shots, score, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
