#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# A keystore e a senha ficam um nível acima do repositório, fora do Git, junto do .env.local.
PASTA_DE_FORA="$(cd .. && pwd)"
ARQUIVO_DE_SEGREDOS="$PASTA_DE_FORA/.env.local"
KEYSTORE="$PASTA_DE_FORA/credenciais/assinaaqui-preview.jks"
ALIAS=assinaaqui

if [ -f "$KEYSTORE" ]; then
  echo "A keystore já existe em $KEYSTORE; nada a fazer."
  exit 0
fi
if grep -q '^ASSINAAQUI_KEYSTORE_PASSWORD=' "$ARQUIVO_DE_SEGREDOS" 2> /dev/null; then
  echo "O $ARQUIVO_DE_SEGREDOS já tem ASSINAAQUI_KEYSTORE_PASSWORD, mas a keystore sumiu. Restaure a keystore ou apague a linha." >&2
  exit 1
fi

if command -v vfox > /dev/null && [ -f .vfox.toml ]; then
  eval "$(vfox env -s bash)"
fi

mkdir -p "$(dirname "$KEYSTORE")"
ASSINAAQUI_KEYSTORE_PASSWORD="$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')"
export ASSINAAQUI_KEYSTORE_PASSWORD

"${JAVA_HOME:+$JAVA_HOME/bin/}keytool" -genkeypair -noprompt \
  -storetype PKCS12 -keystore "$KEYSTORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass:env ASSINAAQUI_KEYSTORE_PASSWORD \
  -dname "CN=AssinaAqui, O=AssinaAqui, C=BR" > /dev/null

if [ -s "$ARQUIVO_DE_SEGREDOS" ] && [ -n "$(tail -c 1 "$ARQUIVO_DE_SEGREDOS")" ]; then
  echo >> "$ARQUIVO_DE_SEGREDOS"
fi
printf 'ASSINAAQUI_KEYSTORE_PASSWORD=%s\nASSINAAQUI_KEY_ALIAS=%s\n' "$ASSINAAQUI_KEYSTORE_PASSWORD" "$ALIAS" >> "$ARQUIVO_DE_SEGREDOS"
chmod 600 "$KEYSTORE"

echo "Keystore criada em $KEYSTORE; a senha foi guardada no $ARQUIVO_DE_SEGREDOS."
echo "Guarde uma cópia dos dois: sem eles, o próximo APK de entrega não instala por cima do anterior."
