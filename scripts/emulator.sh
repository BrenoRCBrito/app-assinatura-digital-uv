#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# O aparelho padrão dos testes de interface: o mesmo AVD que o `maestro start-device` cria para um Pixel 7 com
# Android 15 (API 35). Os fluxos do .maestro medem os gestos em porcentagem da tela desse aparelho.
AVD=Maestro_ANDROID_pixel_7_android-35
API=35
# O AVD criado pelo avdmanager vem com a GPU desligada, e assim o emulador cai no meio dos fluxos. Com a GPU do PC
# ele fica estável; EMULADOR_GPU=swiftshader_indirect desenha pela CPU, para quando a GPU não funcionar.
GPU="${EMULADOR_GPU:-host}"

if [ -n "${ANDROID_HOME:-}" ]; then
  SDK="$ANDROID_HOME"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  SDK="$ANDROID_SDK_ROOT"
elif [ "$(uname -s)" = Darwin ]; then
  SDK="$HOME/Library/Android/sdk"
else
  SDK="$HOME/Android/Sdk"
fi
EMULADOR="$SDK/emulator/emulator"
FERRAMENTAS="$SDK/cmdline-tools/latest/bin"
ADB="${ADB:-$(command -v adb || echo "$SDK/platform-tools/adb")}"

falhar() {
  echo "$1" >&2
  exit 1
}

[ -x "$EMULADOR" ] ||
  falhar "Não achei o emulador em $SDK/emulator. Instale o Android Emulator pelo SDK Manager do Android Studio ou aponte o ANDROID_HOME para o seu Android SDK."
[ -x "$ADB" ] || falhar "Não achei o adb. Instale o Android SDK Platform-Tools pelo SDK Manager do Android Studio."

# Já ligado: nada a fazer.
for serial in $("$ADB" devices | awk 'NR > 1 && $1 ~ /^emulator-/ { print $1 }'); do
  if [ "$("$ADB" -s "$serial" emu avd name 2> /dev/null | head -n 1 | tr -d '\r')" = "$AVD" ]; then
    echo "O emulador $AVD já está ligado, como $serial."
    exit 0
  fi
done

if ! "$EMULADOR" -list-avds 2> /dev/null | grep -qx "$AVD"; then
  case "$(uname -m)" in
    arm64 | aarch64) ABI=arm64-v8a ;;
    *) ABI=x86_64 ;;
  esac
  IMAGEM="system-images;android-$API;google_apis;$ABI"
  [ -x "$FERRAMENTAS/avdmanager" ] ||
    falhar "Para criar o emulador, instale o Android SDK Command-line Tools (latest) pelo SDK Manager do Android Studio."
  # O sdkmanager e o avdmanager rodam na JVM.
  source scripts/java.sh "O avdmanager do Android SDK"
  if [ ! -d "$SDK/system-images/android-$API/google_apis/$ABI" ]; then
    echo "Baixando a imagem do Android 15 ($IMAGEM), só na primeira vez." >&2
    "$FERRAMENTAS/sdkmanager" --install "$IMAGEM"
  fi
  echo "Criando o emulador $AVD: Pixel 7 com Android 15." >&2
  # O avdmanager pergunta se é para personalizar o hardware; a resposta é não, como no maestro start-device.
  echo no | "$FERRAMENTAS/avdmanager" create avd --name "$AVD" --package "$IMAGEM" --device pixel_7 > /dev/null
fi

# Uma porta própria dá o nome do aparelho no adb (emulator-<porta>) antes de ele aparecer.
porta=5554
while "$ADB" devices | grep -q "^emulator-$porta[[:space:]]"; do
  porta=$((porta + 2))
done
SERIAL="emulator-$porta"
LOG="${XDG_CACHE_HOME:-$HOME/.cache}/assinaaqui/emulador.log"
mkdir -p "$(dirname "$LOG")"

echo "Ligando o $AVD como $SERIAL, com a GPU em modo $GPU. O log fica em $LOG." >&2
# O que vier depois de -- vai para o emulador, como -no-window. O emulador continua ligado quando o script termina.
nohup "$EMULADOR" -avd "$AVD" -port "$porta" -gpu "$GPU" -netdelay none -netspeed full "$@" > "$LOG" 2>&1 &
pid=$!

limite=$((SECONDS + 300))
until [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2> /dev/null | tr -d '\r')" = 1 ]; do
  if ! kill -0 "$pid" 2> /dev/null; then
    tail -n 15 "$LOG" >&2
    falhar "O emulador fechou antes de o Android abrir; o log completo está em $LOG. Se a falha for da GPU, tente: EMULADOR_GPU=swiftshader_indirect npm run emulator"
  fi
  [ "$SECONDS" -lt "$limite" ] || falhar "O Android não terminou de abrir em 5 minutos. Veja o log em $LOG."
  sleep 2
done
"$ADB" -s "$SERIAL" shell wm dismiss-keyguard > /dev/null 2>&1 || true

if [ -n "$("$ADB" -s "$SERIAL" shell pm path com.brcb.AssinaAqui 2> /dev/null)" ]; then
  echo "Pronto: $SERIAL ligado e com o AssinaAqui instalado. Rode npm run e2e."
else
  echo "Pronto: $SERIAL ligado. Falta instalar o APK do AssinaAqui: adb -s $SERIAL install -r build-<número>.apk (veja \"Gerar o APK do Android\" no README)."
fi
