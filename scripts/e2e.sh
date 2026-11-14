#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORTA="${PORT:-3000}"
ADB="${ADB:-$(command -v adb || echo "${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb")}"

falhar() {
  echo "$1" >&2
  exit 1
}

aparelhos="$("$ADB" devices | awk 'NR > 1 && $2 == "device" { print $1 }')"
[ -n "$aparelhos" ] || falhar "Conecte um celular pelo adb ou ligue um emulador, com o APK do AssinaAqui instalado."

# O documento de teste precisa estar na mesma API que o app consulta. API_URL é o endereço que o app usa;
# REGISTRO, o endereço pelo qual este PC registra o documento.
if [ "${API_LOCAL:-}" = 1 ]; then
  # API no PC (npm run api:up). Só o APK de desenvolvimento aceita outro endereço: o de entrega usa sempre o do build.
  REGISTRO="http://127.0.0.1:$PORTA"
  curl --silent --fail "$REGISTRO/saude" > /dev/null || falhar "A API não respondeu. Suba antes: npm run api:up"
  # O emulador enxerga o PC pelo 10.0.2.2; um celular de verdade, pelo IP do PC no wifi.
  if [ -z "${API_URL:-}" ]; then
    if echo "$aparelhos" | grep -q '^emulator-'; then
      API_URL="http://10.0.2.2:$PORTA"
    else
      ip="$(ip -4 route get 1.1.1.1 2> /dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit } }')"
      API_URL="http://${ip:-localhost}:$PORTA"
    fi
  fi
else
  # Por padrão, a mesma API que vai dentro do APK de entrega: a do perfil preview do eas.json (o Render).
  API_URL="${API_URL:-$(node -p "require('./eas.json').build.preview.env.ASSINAAQUI_API_URL")}"
  API_URL="${API_URL%/}"
  REGISTRO="$API_URL"
  echo "Acordando a API em $API_URL (no plano grátis do Render, leva até um minuto)..."
  curl --silent --fail --max-time 90 "$REGISTRO/saude" > /dev/null || falhar "A API em $API_URL não respondeu."
fi

resposta="$(curl --silent --fail --max-time 90 -X POST -H 'Content-Type: application/json' \
  -d '{"campos":[{"chave":"id","valor":"1"},{"chave":"email","valor":"maestro@exemplo.com"},{"chave":"titulo","valor":"Documento de teste do Maestro"}]}' \
  "$REGISTRO/documentos")"
CODIGO="$(node -e 'console.log(JSON.parse(process.argv[1]).codigo)' "$resposta")"

echo "Documento de teste registrado com o código $CODIGO. O app vai usar a API em $API_URL."

# A conta de teste fica no .env.local de fora do Git. O Maestro lê sozinho as variáveis com prefixo MAESTRO_,
# então a senha não passa pela linha de comando.
ler_segredo() {
  [ -f ../.env.local ] || return 0
  sed -n "s/^[[:space:]]*$1=//p" ../.env.local | tail -n 1 | sed -E "s/^['\"]|['\"]$//g"
}
MAESTRO_EMAIL="${MAESTRO_EMAIL:-$(ler_segredo MAESTRO_EMAIL)}"
MAESTRO_SENHA="${MAESTRO_SENHA:-$(ler_segredo MAESTRO_SENHA)}"
filtro=()
if [ -n "$MAESTRO_EMAIL" ] && [ -n "$MAESTRO_SENHA" ]; then
  export MAESTRO_EMAIL MAESTRO_SENHA
else
  echo "Sem MAESTRO_EMAIL e MAESTRO_SENHA no ../.env.local: os fluxos que entram na conta ficam de fora." >&2
  filtro=(--exclude-tags conta)
fi

# Arquivos .yaml nos argumentos escolhem os fluxos; sem eles, roda a pasta .maestro inteira.
fluxos=()
opcoes=()
for argumento in "$@"; do
  case "$argumento" in
    *.yaml | *.yml) fluxos+=("$argumento") ;;
    *) opcoes+=("$argumento") ;;
  esac
done
[ "${#fluxos[@]}" -gt 0 ] || fluxos=(.maestro)

bash scripts/maestro.sh test -e API_URL="$API_URL" -e CODIGO="$CODIGO" "${filtro[@]}" "${opcoes[@]}" "${fluxos[@]}"
