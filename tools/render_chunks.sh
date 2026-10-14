#!/bin/bash
# Render a composition in chunks so an interrupted render can resume, then join them and add the voice.
# Finished chunks are kept in out/chunks/<id>/ and skipped on the next run.
# Usage: tools/render_chunks.sh [CompositionId] [output.mp4] [chunks]
set -euo pipefail
ID=${1:-EngineTikTok}
OUT=${2:-out/dong-co-dot-trong-tiktok.mp4}
N=${3:-8}
DIR=out/chunks/$ID
mkdir -p "$DIR"

FRAMES=$(npx remotion compositions 2>/dev/null | awk -v id="$ID" '$1 == id {print $4}')
[ -n "$FRAMES" ] || { echo "composition $ID not found"; exit 1; }
STEP=$(( (FRAMES + N - 1) / N ))

: > "$DIR/list.txt"
for ((i = 0; i < N; i++)); do
  A=$(( i * STEP )); B=$(( A + STEP - 1 )); (( B >= FRAMES )) && B=$(( FRAMES - 1 ))
  F="$DIR/part$i.mp4"
  echo "file 'part$i.mp4'" >> "$DIR/list.txt"
  if [ -s "$F" ]; then echo "chunk $i ($A-$B) done"; continue; fi
  echo "chunk $i: frames $A-$B"
  npx remotion render "$ID" "$F.tmp.mp4" --frames="$A-$B" --muted --concurrency=4 --log=error
  mv "$F.tmp.mp4" "$F"
done

# join the video chunks without re-encoding, then add the voice-over
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -i public/voice/engine.mp3 \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -af apad -shortest -movflags +faststart "$OUT"
echo "written $OUT"
