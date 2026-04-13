#!/bin/bash
# Converts the raw Playwright recording to an MP4 with title cards.
#
# Usage: bash demo/scripts/add-captions.sh <input.webm> <output.mp4>
#
# Requires: ffmpeg (brew install ffmpeg)

set -euo pipefail

INPUT="${1:?Usage: add-captions.sh <input.webm> <output.mp4>}"
OUTPUT="${2:-demo/output/demo-final.mp4}"

mkdir -p "$(dirname "$OUTPUT")"

# Step 1: Convert WebM to MP4 at high quality
echo "Converting to MP4..."
ffmpeg -y -i "$INPUT" \
  -c:v libx264 -crf 18 -preset slow \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -pix_fmt yuv420p \
  -an \
  "$OUTPUT"

echo ""
echo "✓ Output: $OUTPUT"
echo ""
echo "Next: open in iMovie or DaVinci Resolve to add:"
echo "  - Title card: 'Novyx Vault — your AI actually remembers'"
echo "  - Captions at each scene transition (see demo/captions.txt)"
echo "  - Background music (royalty-free, low volume)"
echo "  - End card: vault.novyxlabs.com + GitHub link"
echo ""
echo "Or keep it raw — the Playwright recording shows real product usage."
