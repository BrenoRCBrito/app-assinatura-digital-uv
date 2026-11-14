#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORTA="${PORT:-3000}"
MAESTRO="${MAESTRO:-$(command -v maestro || echo "$HOME/.maestro/bin/maestro")}"
ADB="${ADB:-$(command -v adb || echo "${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb")}"

falhar() {
  echo "$1" >&2
  exit 1
}

[ -x "$MAESTRO" ] || falhar 'Instale o Maestro: curl -Ls "https://get.maestro.mobile.dev" | bash'
aparelhos="$("$ADB" devices | awk 'NR > 1 && $2 == "device" { print $1 }')"
[ -n "$aparelhos" ] || falhar "Conecte um celular pelo adb ou ligue um emulador, com o APK do AssinaAqui instalado."
curl --silent --fail "http://127.0.0.1:$PORTA/saude" > /dev/null || falhar "A API não respondeu. Suba antes: npm run api:up"

# O emulador enxerga o PC pelo 10.0.2.2; um celular de verdade, pelo IP do PC no wifi.
if [ -z "${API_URL:-}" ]; then
  if echo "$aparelhos" | grep -q '^emulator-'; then
    API_URL="http://10.0.2.2:$PORTA"
  else
    ip="$(ip -4 route get 1.1.1.1 2> /dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit } }')"
    API_URL="http://${ip:-localhost}:$PORTA"
  fi
fi

resposta="$(curl --silent --fail -X POST -H 'Content-Type: application/json' \
  -d '{"campos":[{"chave":"id","valor":"1"},{"chave":"email","valor":"maestro@exemplo.com"},{"chave":"titulo","valor":"Documento de teste do Maestro"}]}' \
  "http://127.0.0.1:$PORTA/documentos")"
CODIGO="$(node -e 'console.log(JSON.parse(process.argv[1]).codigo)' "$resposta")"

echo "Documento de teste registrado com o código $CODIGO. O app vai usar a API em $API_URL."
"$MAESTRO" test -e API_URL="$API_URL" -e CODIGO="$CODIGO" "$@" .maestro
