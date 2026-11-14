#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Mesmo arquivo que o app.config.js lê: fica um nível acima do repositório, fora do Git.
PASTA_DE_FORA="$(cd .. && pwd)"
ARQUIVO_DE_SEGREDOS="$PASTA_DE_FORA/.env.local"
KEYSTORE="$PASTA_DE_FORA/credenciais/assinaaqui-preview.jks"
VERSAO_DO_EAS=27.7.2
PERFIL="${1:-preview}"

falhar() {
  echo "$1" >&2
  exit 1
}

if [ -f "$ARQUIVO_DE_SEGREDOS" ]; then
  set -a
  . "$ARQUIVO_DE_SEGREDOS"
  set +a
fi
[ -n "${GOOGLE_MAPS_ANDROID_KEY:-}" ] ||
  falhar "Defina GOOGLE_MAPS_ANDROID_KEY em $ARQUIVO_DE_SEGREDOS: sem ela, o mapa não desenha no APK."

case "$PERFIL" in
  preview)
    [ -f "$KEYSTORE" ] && [ -n "${ASSINAAQUI_KEYSTORE_PASSWORD:-}" ] ||
      falhar "Falta a keystore do APK de entrega. Rode uma vez: npm run android:keystore"
    # O EAS só lê as credenciais locais do credentials.json da raiz; ele é gerado aqui e apagado no fim.
    trap 'rm -f credentials.json' EXIT
    cat > credentials.json << JSON
{
  "android": {
    "keystore": {
      "keystorePath": "$KEYSTORE",
      "keystorePassword": "$ASSINAAQUI_KEYSTORE_PASSWORD",
      "keyAlias": "${ASSINAAQUI_KEY_ALIAS:-assinaaqui}",
      "keyPassword": "$ASSINAAQUI_KEYSTORE_PASSWORD"
    }
  }
}
JSON
    ;;
  development)
    grep -q '"expo-dev-client"' package.json ||
      falhar "O perfil development precisa do expo-dev-client: npx expo install expo-dev-client"
    ;;
  *)
    falhar "Perfil desconhecido: $PERFIL. Use preview (padrão) ou development."
    ;;
esac

if command -v vfox > /dev/null && [ -f .vfox.toml ]; then
  eval "$(vfox env -s bash)"
fi

versao_do_node="$(node --version)"
versao_do_node="${versao_do_node#v}"
[ "${versao_do_node%%.*}" -ge 26 ] || falhar "Use a Node 26 (LTS), a do .vfox.toml; a encontrada é a $versao_do_node."

versao_do_java="$("${JAVA_HOME:+$JAVA_HOME/bin/}java" -version 2>&1 | awk -F'"' '/version/ { print $2; exit }' || true)"
[ "${versao_do_java%%.*}" = 17 ] ||
  falhar "O build do Android usa o JDK 17, e o java encontrado é o ${versao_do_java:-de nenhuma versão}. Aponte o JAVA_HOME para um JDK 17."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
[ -d "$ANDROID_HOME" ] || falhar "Android SDK não encontrado em $ANDROID_HOME. Defina ANDROID_HOME."
export PATH="$ANDROID_HOME/platform-tools:$PATH"

# O build local ocupa alguns GB de temporários, mais do que cabe num /tmp em memória.
export TMPDIR="${TMPDIR_DO_BUILD:-$HOME/.cache/eas-build-tmp}"
mkdir -p "$TMPDIR"
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ABIS_DO_ANDROID:-arm64-v8a,x86_64}"

npx --yes "eas-cli@$VERSAO_DO_EAS" build --platform android --profile "$PERFIL" --local
