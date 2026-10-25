#!/bin/sh
# Rebuild "Why Do We Sneeze at the Sun?" (Autumn Watercolour demo): voice → speech check → events → score + foley → mix → frames → master.
# LIB = the library root (defaults to this repo). Built in a temporary copy; the film goes to ${OUT:-styles/autumn-watercolour}/autumn-watercolour.mp4.
set -e
LIB=${LIB:-$(cd "$(dirname "$0")/../../.." && pwd)}
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-$HERE/..}; mkdir -p "$OUT"
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
export LIB PATH="$LIB/tools/bin:$LIB/tools/probe:$PATH" PYTHONIOENCODING=utf-8 PYTHONUTF8=1
WORK=$(mktemp -d); cp -r "$HERE"/. "$WORK"/; mkdir -p "$WORK/voice" "$WORK/out"
cd "$LIB"
python core/tts/tts.py "$WORK/lines.json" "$WORK/voice"
python core/tts/asr_check.py "$WORK/lines.json" "$WORK/voice"
node core/render/events.mjs "$WORK"
python "$WORK/mix.py" "$WORK"
node core/render/video.mjs "$WORK" --fps 24 --workers 4 --out "$WORK/out/video.mp4"
sh "$WORK/mux_win.sh" "$WORK/out/video.mp4" "$WORK/out/mix.wav" "$OUT/autumn-watercolour.mp4" 24 1
rm -rf "$WORK"
