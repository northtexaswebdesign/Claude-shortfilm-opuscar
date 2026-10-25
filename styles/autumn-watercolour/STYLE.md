# Autumn Watercolour — Style Prompt

Based on Deadpan Style (deadpan) from Lemo-Opuscar, itself built on Urban Sketch · Pen & Wash (urban-sketch). A style of The Deadpan Why channel.

> Transparent watercolour in layered glazes on cold-press paper, in an autumn palette, with the channel's drawn faces and one deadpan caption. Paper is the light. Colour is laid crisply, then glazed darker toward the shadow side. Leaves drift past the lens.
> Reference (grammar only): Winslow Homer's watercolours — clean first washes, a few decisive glazes, paper left for light. Nothing is copied: no compositions, figures or motifs.

**Source prompt** (the channel's own words; every point is written into the sections below):

```text
Style: Autumn Transparent Watercolour · 2D

Transparent watercolour in layered glazes on cold-press paper. Draw shapes crisply first, then two or three glazes, each smaller and darker, drying to a tide-mark edge; two or three blooms, about 1/10 of frame width, inside large washes, never on figures; light granulation (±4%). Paper is the brightest white; light objects and highlights left as paper. Sky and water wet-in-wet, ripples dry-brush. Roles: autumn gold #ECAA34, scarlet #E46030, rust #B8743C for foliage and accents, against grey-blue mist #C2C6D2 and violet-grey shadows #8A8496; sky pale and cool at any time of day; ground pale green-ochre. Foliage: pale wash, scallop-edged clusters, dark dots, flicked leaves; with few trees, warm colours go to scrub, roofs, clothes. Light from one side. Camera: slow pan, gentle push, leaves drifting past the lens. Reference: Winslow Homer's watercolours. Avoid: opaque gouache, airbrushed blur, vector edges, muddy colour, saturated sunsets.
```

## 1. Essence, and what it is not

Transparent colour over paper. Every shape is laid **crisply first** (one clean wash with a slightly irregular, hand-cut edge), then **two or three glazes**, each smaller and darker, pushed to the shadow side, each **drying to a tide-mark edge**. The paper is the brightest white: suns, highlights, a white shirt, the sign's face are left as paper. Two or three **blooms** (about 1/10 of the frame width) sit inside large washes (sky, ground, walls), never on figures. People keep the channel's drawn faces and one deadpan caption.

Not Deadpan Style (no black nib line; colour leads, line follows). Not Watercolor Brush (no visible brush ribbons or dry-brush flying white on every stroke; no journal labels by default). Avoid opaque gouache, airbrushed blur, vector edges, muddy colour and saturated sunsets.

## 2. Materials & rendering

- **Paper**: cold-press `#FBF8F1`, mottled, with a tooth tile multiplied over everything; a soft fade to white at the frame edge.
- **Glaze** (`demo/wc.js` `pg.glaze`): first wash a = .4–.6 with edge jitter ~2 px and a tide-mark (pooled edge alpha ~.55); then `n` glazes (1–3) scaled by 1 − .24·i about a point pushed toward the shadow side, mixed 25 %·i toward violet-grey, each with its own tide-mark.
- **Bloom** (`pg.bloom`): a soft paler centre (screen) with a faint frilly ring (multiply, alpha ~.16, slightly blurred). Inside big washes only.
- **Wet-in-wet** (`pg.wet`): sky, water and mist as overlapping blurred bands (blur ~26 px) that melt into each other.
- **Dry-brush ripples** (`pg.ripples`): short broken horizontal dabs that skip the paper tooth.
- **Granulation**: ±4 % pigment variation by paper grain (compositor shader).
- **Line**: a soft violet-brown `#4E4052` drawing line at ~62 % strength (figures, faces, a few props). Never black.
- **People**: the 2D cartoon rig `demo/toon.js`, washed in the autumn palette; they boil at 12 fps; the page does not.

## 3. Colour logic

- **Roles**: autumn gold `#ECAA34`, scarlet `#E46030`, rust `#B8743C` for foliage, accents and clothes; grey-blue mist `#C2C6D2` and violet-grey `#8A8496` for distance and shadow.
- **Sky** pale and cool at any time of day (`#CFDCE8` → `#E4E8EE` → mist). **Ground** pale green-ochre `#C9C79A`.
- **Light from one side** (default from the left): glazes and cast shadows fall to the right. The sun is a paper disc in a faint gold halo.
- With few trees, warm colours move to scrub, roofs and clothes. Keep colour clean: at most three glazes, never more.

## 4. Type & subtitles

- **One caption per scene**, hand-lettered (Patrick Hand SC, ~1/30 of frame height), written letter by letter on a paper halo; dry, short, never repeating the narration word for word. It lands after the beat it comments on.
- On-page writing in Caveat (labels, signs, a data note); a margin note in Reenie Beanie.
- Numbers are written as digits on screen and spelled out in the voice.

## 5. Motion quality

- The page paints itself: lines first, colour arriving from a point as a wet front.
- Living things wobble (12 fps boil); the drawing holds still.
- **Leaves drift past the lens** (`driftLeaves`): one to three out-of-focus leaves in gold, scarlet and rust crossing the frame on slow curves.
- Acting is small and deadpan; sneezes, gasps and surprises are the only big motions.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Slow pan (5–8 % of the page) | walking through the season | a street, a hillside, a lane |
| Gentle push-in (3–8 %) | attention gathering | every explanation beat |
| Locked page, things paint in | study | a diagram on a big head, a chalkboard |
| Leaves crossing the lens | air, time passing | between beats; over a held caption |
| Split frame (rare) | a direct comparison | at most one per film |

No whips, no dissolves; page turns wash out to paper.

## 7. Sound palette

Acoustic and gentle: harp, steel or nylon guitar, light percussion, a drone; one new music family per video. Foley at cartoon scale (pen scratch, page turns, pops, sneezes, creaks). One beat of bed silence before the punchline. Voice forward, music ducked, −14 LUFS.

## 8. Native moves

- **The glaze reveal**: a shape lands pale, then darkens in two glazes as the voice names it.
- **The paper sun**: light is the absence of paint; a halo of gold glaze around a paper disc.
- **The drifting leaf**: a foreground leaf crosses as the caption lands.
- **The caption lands** (from Deadpan Style).

## 9. Pitfalls of the medium

- **Blooms drawn as hard rings** read as spiky clouds → keep the ring faint (alpha ≤ .2), slightly blurred, low frill amplitude.
- **A big pale disc behind each tree** reads as a balloon → base wash alpha ≤ .15 with rough edges.
- **Washes for things that arrive later** paint in with the page and show an empty rectangle → draw late arrivals as dynamic prims with `popIn`, not static page washes.
- **More than three glazes** go muddy; **black lines** break the look.
- Labels behind trees or heads → check stills.

## 10. Engine

`demo/wc.js` (this style): `addWatercolour(pg)` adds `glaze`, `bloom`, `wet`, `ripples`, `tree`, `scrub` to the Deadpan page; `driftLeaves(ctx, t)`; palette `AU`. `demo/engine.js` (Deadpan engine with a violet-brown line, ±4 % granulation, softer wet front). `demo/toon.js`, `demo/kit.js`, `demo/film.js` (timeline, camera, caption, leaves), `demo/mix.py`. Technique base: [`../deadpan/`](../deadpan/STYLE.md).

## 11. Variation space

Subject, cast, places, music family, opening and ending are free. Good fits: seasonal science, the body, everyday nature, anything outdoors. Far from the demo: a single tree through four glazed seasons; a river followed from source to sea; one kitchen window watched for a day.

---

How the demo was made: [DEMO.md](DEMO.md).
