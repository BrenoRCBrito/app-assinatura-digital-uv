# AssinaAqui

App de assinatura digital para iOS e Android, feito com Expo, e a API HTTP que guarda os documentos assinados e confere os códigos de autenticidade.

## Alunos

- Breno Ronan Cadinha de Brito - 202421729
- Adrian Pardal Caldeiras - 2023132122

## Requisitos

- Node 26 (LTS). O `.vfox.toml` fixa a versão para quem usa o vfox.
- Para a API: Docker ou Podman.
- Para o APK: JDK 17 (também fixado no `.vfox.toml`), Android SDK em `~/Android/Sdk` (ou em `ANDROID_HOME`) e uma conta Expo logada com `npx eas-cli login`.
- Um arquivo `.env.local` na pasta acima do repositório, fora do Git:

```
ASSINAAQUI_HMAC_SECRET=<32 caracteres ou mais>
GOOGLE_MAPS_ANDROID_KEY=<chave do Maps SDK for Android>
```

Depois de clonar, instale as dependências com `npm ci`.

## Subir a API HTTP

| Comando | O que faz |
| --- | --- |
| `npm run api:up` | sobe a API num contêiner e mostra o endereço para o celular, como `http://192.168.0.10:3000` |
| `npm run api:down` | para a API e mantém os documentos registrados |
| `npm run api:down -- --volumes` | para a API e apaga os documentos registrados |
| `npm run api:logs` | acompanha o log da API |

O celular e o PC precisam estar no mesmo wifi. Para conferir, abra `<endereço>/saude` no navegador do celular: a resposta é `{"ok":true}`. Mais detalhes em [`api/README.md`](api/README.md).

## Gerar o APK do Android

```
npm run android:apk
```

O build roda no PC, sem a nuvem do Expo, e grava o arquivo `build-<número>.apk` na raiz do repositório. Instale pelo Expo Orbit ou com `adb install -r build-<número>.apk`. Só é preciso gerar de novo quando muda uma dependência nativa ou a configuração nativa do app.

## Rodar o app

```
npx expo start
```

- **iPhone:** abra pelo Expo Go.
- **Android:** abra pelo APK de desenvolvimento.
- **API:** o app encontra a API pelo IP do PC que roda o Metro. Se usar `npx expo start --tunnel`, defina `ASSINAAQUI_API_URL=http://<ip-do-pc>:3000` no `.env.local`.

## Testes

| Comando | O que roda |
| --- | --- |
| `npm test` | testes do app |
| `npm run typecheck` | checagem de tipos do app |
| `npm run test:api` | testes da API |
