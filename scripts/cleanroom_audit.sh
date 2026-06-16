#!/usr/bin/env bash
# =============================================================================
# Clean-room audit — legal gate.
# Fails (exit 1) if any GlobaLeaks-specific marker appears in the PRODUCT code.
# The product must contain ZERO traces of GlobaLeaks (AGPL-3.0) to stay
# proprietary. `reference/` (the study clone) is intentionally excluded.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Product directories to scan (everything except the study reference).
SCAN_DIRS=(backend frontend compliance scripts db)

# Markers that would betray copied GlobaLeaks code/identifiers.
# (Word-ish patterns; case-insensitive.)
MARKERS='globaleaks|globaleak|glbackend|gl_backend|\bitip\b|\brtip\b|\bGCE\b|txtorcon|receivertip|internaltip'

found=0
for d in "${SCAN_DIRS[@]}"; do
  [ -d "$d" ] || continue
  if grep -RInE --binary-files=without-match \
        --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=__pycache__ \
        --exclude="cleanroom_audit.sh" \
        "$MARKERS" "$d" ; then
    found=1
  fi
done

if [ "$found" -ne 0 ]; then
  echo ""
  echo "❌ CLEAN-ROOM AUDIT FAILED: GlobaLeaks markers found above. Remove them."
  exit 1
fi

echo "✅ Clean-room audit passed: no GlobaLeaks markers in product code."
