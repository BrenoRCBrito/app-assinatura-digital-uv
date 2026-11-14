#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Versão fixa do Maestro, baixada do release oficial e conferida pelo SHA-256 publicado em checksums_sha256.txt.
VERSAO=2.12.1
SHA256=54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7
URL="https://github.com/mobile-dev-inc/maestro/releases/download/cli-$VERSAO/maestro.zip"
PASTA="${XDG_CACHE_HOME:-$HOME/.cache}/assinaaqui/maestro/$VERSAO"
BINARIO="$PASTA/maestro/bin/maestro"

falhar() {
  echo "$1" >&2
  exit 1
}

soma_sha256() {
  if command -v sha256sum > /dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

if [ ! -x "$BINARIO" ]; then
  command -v curl > /dev/null || falhar "Instale o curl para baixar o Maestro."
  command -v unzip > /dev/null || falhar "Instale o unzip para extrair o Maestro."
  temporaria="$(mktemp -d)"
  trap 'rm -rf "$temporaria"' EXIT
  echo "Baixando o Maestro $VERSAO (cerca de 335 MB, só na primeira vez) para $PASTA." >&2
  curl --fail --location --progress-bar --output "$temporaria/maestro.zip" "$URL"
  [ "$(soma_sha256 "$temporaria/maestro.zip")" = "$SHA256" ] ||
    falhar "O maestro.zip baixado não confere com o SHA-256 esperado. Nada foi instalado; tente de novo."
  unzip -q "$temporaria/maestro.zip" -d "$temporaria/extraido"
  [ -x "$temporaria/extraido/maestro/bin/maestro" ] || falhar "O maestro.zip não trouxe o maestro/bin/maestro esperado."
  mkdir -p "$(dirname "$PASTA")"
  rm -rf "$PASTA"
  mv "$temporaria/extraido" "$PASTA"
fi

# O Maestro roda na JVM.
source scripts/java.sh "O Maestro"

# Sem envio de dados de uso ao fabricante do Maestro.
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

exec "$BINARIO" "$@"
