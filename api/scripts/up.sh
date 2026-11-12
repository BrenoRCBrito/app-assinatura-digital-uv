#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. scripts/motor.sh

# Mesmo arquivo que o app.config.js lê: fica um nível acima do repositório, fora do Git.
ARQUIVO_DE_SEGREDOS="$(cd ../.. && pwd)/.env.local"
PORTA="${PORT:-3000}"
ESPERA_MAXIMA_S=30

if ! grep -q '^ASSINAAQUI_HMAC_SECRET=' "$ARQUIVO_DE_SEGREDOS" 2> /dev/null; then
  echo "Defina ASSINAAQUI_HMAC_SECRET, com 32 caracteres ou mais, em $ARQUIVO_DE_SEGREDOS." >&2
  exit 1
fi
set -a
. "$ARQUIVO_DE_SEGREDOS"
set +a

ip_na_rede() {
  if command -v ip > /dev/null; then
    ip -4 route get 1.1.1.1 2> /dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit } }'
  elif command -v ipconfig > /dev/null; then
    ipconfig getifaddr en0 2> /dev/null || true
  fi
}

IP="$(ip_na_rede)"
export ASSINAAQUI_ENDERECO_NA_REDE="http://${IP:-localhost}:${PORTA}"

echo "Montando a imagem com $MOTOR..."
if [ "$MOTOR" = podman ]; then
  podman build --quiet --format docker --tag "$IMAGEM" . > /dev/null
else
  docker build --quiet --tag "$IMAGEM" . > /dev/null
fi

"$MOTOR" rm --force "$CONTEINER" > /dev/null 2>&1 || true
# O segredo vai pelo ambiente, só com o nome da variável: o valor não aparece na linha de comando.
"$MOTOR" run --detach --name "$CONTEINER" --init \
  --publish "$PORTA:3000" \
  --env ASSINAAQUI_HMAC_SECRET \
  --env ASSINAAQUI_ENDERECO_NA_REDE \
  --volume "$VOLUME:/app/dados" \
  "$IMAGEM" > /dev/null

for _ in $(seq "$ESPERA_MAXIMA_S"); do
  if curl --silent --fail "http://127.0.0.1:$PORTA/saude" > /dev/null; then
    echo
    echo "API do AssinaAqui no ar. No celular, no mesmo wifi: $ASSINAAQUI_ENDERECO_NA_REDE"
    echo "Para conferir: $ASSINAAQUI_ENDERECO_NA_REDE/saude. Para parar: npm run api:down."
    exit 0
  fi
  sleep 1
done

echo "A API não respondeu em $ESPERA_MAXIMA_S s. Últimas linhas do contêiner:" >&2
"$MOTOR" logs --tail 20 "$CONTEINER" >&2
exit 1
