// One timeline for picture, sound and subtitles. Bar = 1.5 s (jazz waltz, 3/4 at 120 bpm).
export const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 3;
export const DUR = 60;

// Narration: start times (s). Durations come from voice/dur.json at build time.
export const VO = {
  v01: 1.2, v02: 9.9, v03: 15.6, v04: 20.6, v05: 27.0,
  v06: 32.0, v07: 37.2, v08: 42.4, v09: 46.8, v10: 52.4,
};

// Key story times
export const T = {
  bloomA: 3.0,          // summer colour arrives from the kite (bar 3)
  whip1: 9.0,           // to the adult's year
  flick0: 10.0, flickStep: .25, flicks: 20,
  title: 11.0,          // the question in the margin
  toRuler: 15.0,
  fifth: 17.6,          // one year of five painted
  pull: 21.0,           // pull back to fifty years
  fiftieth: 23.2,
  silence: 25.5,        // bar 18: one bar of nothing
  after: 27.0,
  clock: 28.8, strike: 29.9, memories: 30.6,
  bag: 32.5, sea: 34.0,
  whip2: 36.5,          // to the commute
  loops: [36.8, 38.1, 39.0, 39.6, 40.0, 40.3, 40.5, 40.65, 40.8, 40.9, 41.0],
  hundred: 40.6,
  toAdult: 42.5,        // fast pan along the empty years
  crane: 45.5,          // near-silence, back up to the bus stop
  step: 46.9, drop: 47.9, kite: 48.0, raise: 48.3,
  bloomE: 49.5,         // bar 34: colour returns
  final: 51.0,          // pull back to the whole page
  endTitle: 53.0, endSub: 55.0,
};
