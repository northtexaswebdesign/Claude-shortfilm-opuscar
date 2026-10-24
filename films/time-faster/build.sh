#!/bin/sh
# Build "Why Time Feels Faster as You Get Older" from source: voice → captions → cues → score → mix → frames → master
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}          # clone mode: <repo>/films/<name>/
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
[ -f "$HERE/voice/dur.json" ] || "$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voice"
"$PY" "$HERE/tools/subs.py"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/audio/score.py"
"$PY" "$HERE/audio/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/time-faster.mp4" 24 1
"$PY" core/render/srt.py "$HERE/subs.json" "$HERE/time-faster.srt"
