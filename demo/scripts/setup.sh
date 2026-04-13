#!/bin/bash
# Demo setup — copies seed notes to the vault folder and seeds memories.
#
# Usage:
#   export NOVYX_MEMORY_API_KEY=your_key
#   bash demo/scripts/setup.sh

set -euo pipefail

VAULT_DIR="${VAULT_DIR:-$HOME/SecondBrain}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Novyx Vault Demo Setup ==="
echo ""

# 1. Copy seed notes
echo "1. Copying seed notes to $VAULT_DIR..."
mkdir -p "$VAULT_DIR"
cp -r "$DEMO_DIR/seed-notes/"* "$VAULT_DIR/"
echo "   ✓ Copied $(find "$DEMO_DIR/seed-notes" -name "*.md" | wc -l | tr -d ' ') notes"

# 2. Seed memories (requires API key)
if [ -n "${NOVYX_MEMORY_API_KEY:-}" ]; then
  echo ""
  echo "2. Seeding memories..."
  npx tsx "$DEMO_DIR/scripts/seed-memories.ts"
else
  echo ""
  echo "2. ⚠ Skipping memory seeding (NOVYX_MEMORY_API_KEY not set)"
  echo "   To seed: export NOVYX_MEMORY_API_KEY=your_key && npx tsx demo/scripts/seed-memories.ts"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Start the dev server:"
echo "     NOVYX_MEMORY_API_KEY=\$NOVYX_MEMORY_API_KEY npm run dev"
echo ""
echo "  2. Record the demo (headed browser so you can see it):"
echo "     npx playwright test demo/scripts/record-demo.spec.ts --headed"
echo ""
echo "  3. Find the recording in test-results/"
echo ""
echo "  4. Post-production (optional):"
echo "     bash demo/scripts/add-captions.sh test-results/*/video.webm demo/output/demo-final.mp4"
