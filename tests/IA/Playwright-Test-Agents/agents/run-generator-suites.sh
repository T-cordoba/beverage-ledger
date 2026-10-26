#!/usr/bin/env bash
# Runs the Generator once per functionality still without a spec, filling the
# generator prompt template with the plan section, target file and describe.
set -u
cd "$(dirname "$0")/.." || exit 1
n=5
while IFS='|' read -r suite file describe; do
  n=$((n + 1))
  name="$(printf '%02d' "$n")-generator-$(basename "$file" .spec.ts)"
  sed -e "s|__SUITE__|$suite|" -e "s|__FILE__|$file|" -e "s|__DESCRIBE__|$describe|" \
    agents/generator.prompt.md > "agents/logs/$name.prompt.tmp"
  bash agents/run-agent.sh generator "agents/logs/$name.prompt.tmp" "$name"
  rm -f "agents/logs/$name.prompt.tmp"
done <<'EOF'
3. RF-17 Traspaso|RF17-transfer.spec.ts|RF-17 Traspaso
4. RF-18 Ajuste|RF18-adjustment.spec.ts|RF-18 Ajuste
5. RF-20 Anulación|RF20-cancellation.spec.ts|RF-20 Anulación
6. RF-21 Comprobante PDF|RF21-receipt.spec.ts|RF-21 Comprobante
EOF
