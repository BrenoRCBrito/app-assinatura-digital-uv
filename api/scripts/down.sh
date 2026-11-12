#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. scripts/motor.sh

"$MOTOR" stop -t 5 "$CONTEINER" > /dev/null 2>&1 || true
"$MOTOR" rm "$CONTEINER" > /dev/null 2>&1 || true

if [ "${1:-}" = --volumes ]; then
  "$MOTOR" volume rm --force "$VOLUME" > /dev/null 2>&1 || true
  echo "API do AssinaAqui parada, e os documentos registrados foram apagados."
else
  echo "API do AssinaAqui parada. Os documentos registrados continuam guardados para a próxima subida."
  echo "Para apagar também os documentos: npm run api:down -- --volumes."
fi
