# Lido com `source scripts/java.sh "<ferramenta>"` pelos scripts que rodam programas da JVM (Maestro, sdkmanager e
# avdmanager), a partir da raiz do repositório. Ativa o JDK 17 do .vfox.toml para quem usa o vfox e para com uma
# mensagem clara quando falta o Java 17 ou mais novo.
if command -v vfox > /dev/null && [ -f .vfox.toml ]; then
  eval "$(vfox env -s bash)"
fi

versao_do_java="$("${JAVA_HOME:+$JAVA_HOME/bin/}java" -version 2>&1 | awk -F'"' '/version/ { print $2; exit }' || true)"
if [ -z "$versao_do_java" ]; then
  echo "$1 precisa do Java 17 ou mais novo, e nenhum java foi encontrado. Instale um JDK 17 ou aponte o JAVA_HOME para ele." >&2
  exit 1
fi
if ! [ "${versao_do_java%%.*}" -ge 17 ] 2> /dev/null; then
  echo "$1 precisa do Java 17 ou mais novo, e o java encontrado é o $versao_do_java." >&2
  exit 1
fi
