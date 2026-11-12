#!/usr/bin/env bash
# Carregado pelos outros scripts: escolhe o motor de contêiner e os nomes compartilhados.

IMAGEM=assinaaqui-api
CONTEINER=assinaaqui-api
VOLUME=assinaaqui-dados

escolher_motor() {
  if [ -n "${CONTAINER_ENGINE:-}" ]; then
    echo "$CONTAINER_ENGINE"
  elif command -v docker > /dev/null && docker info > /dev/null 2>&1; then
    echo docker
  elif command -v podman > /dev/null; then
    echo podman
  else
    echo "Instale o Docker ou o Podman para subir a API." >&2
    return 1
  fi
}

MOTOR="$(escolher_motor)"
