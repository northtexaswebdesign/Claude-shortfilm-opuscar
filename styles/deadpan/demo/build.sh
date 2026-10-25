#!/bin/sh
# Rebuild the demo film "Deadpan Style": silent voice stubs (timing only) → events → score + foley → mix → frames → master.
# LIB = the library root (defaults to this repo). Everything is built in a temporary copy; the film goes to ${OUT:-styles/deadpan}/deadpan.mp4.
set -e
LIB=${LIB:-$(cd "$(dirname "$0")/../../.." && pwd)}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-$HERE/..}; mkdir -p "$OUT"
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
export LIB PATH="$LIB/tools/bin:$LIB/tools/probe:$PATH" PYTHONIOENCODING=utf-8 PYTHONUTF8=1
WORK=$(mktemp -d); cp -r "$HERE"/. "$WORK"/; mkdir -p "$WORK/voice" "$WORK/out"
python - "$WORK" <<'PY'
import json, sys, wave
w = sys.argv[1]; dur = {"s1": 4.5, "s2": 5.5, "s3": 5.5}
json.dump(dur, open(w + '/voice/dur.json', 'w')); json.dump({}, open(w + '/voice/words.json', 'w'))
for k, v in dur.items():
    f = wave.open(f'{w}/voice/{k}.wav', 'wb'); f.setnchannels(1); f.setsampwidth(2); f.setframerate(24000); f.writeframes(b'\0\0' * int(24000 * v)); f.close()
PY
cd "$LIB"
node core/render/events.mjs "$WORK"
python "$WORK/mix.py"
node core/render/video.mjs "$WORK" --fps 24 --workers 4 --out "$WORK/out/video.mp4"
sh "$WORK/mux_win.sh" "$WORK/out/video.mp4" "$WORK/out/mix.wav" "$OUT/deadpan.mp4" 24 1
rm -rf "$WORK"
