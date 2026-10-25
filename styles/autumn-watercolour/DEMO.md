# Autumn Watercolour: how the demo film was made

One example among many. Don't reuse its story, arc, shots, props or timings.

**Film**: *Why Do We Sneeze at the Sun?* (The Deadpan Why), 2:41, 1920×1080, 24 fps, voiced (Kokoro `bm_george`, 0.95). Eight pages: out of the cinema into the sun (hook) · ten people on a hillside, Aristotle and the ACHOO sign (how common) · a big profile head: pepper → trigeminal nerve → sneeze centre · the same head: sun → optic nerve → spill-over sparks → a filing drawer marked NOSE · a tunnel, dark then bright · a family barbecue where three relatives sneeze together · the brain's sorting office forwarding "VERY BRIGHT" to NOSE · the CTA.

**Score**: an autumn Celtic slow jig in 6/8 (modelled harp and steel guitar from `core/audio/pluck.py`, muted conga, faint bagpipe drone). **Foley**: synthesised sneezes, pen, pops, a door creak, nerve sparks.

**Which file draws what**: `wc.js` the watercolour layer (glaze, bloom, wet, ripples, tree, scrub, drifting leaves); `scenes.js` the eight pages (`sneeze()` and `spray()` animate a sneeze; `anatomy()` the shared head diagram); `toon.js` people; `film.js` timeline, camera, caption, leaves; `mix.py` score, foley, mix. Facts and sources: `FACTS.md`.

**Build**: `sh build.sh` (needs the Kokoro voice model; regenerates voice, events, mix, frames and the master).
