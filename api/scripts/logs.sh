#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. scripts/motor.sh

exec "$MOTOR" logs --follow "$CONTEINER"
