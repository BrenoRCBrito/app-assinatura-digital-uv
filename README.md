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
FIREBASE_API_KEY=<do projeto Firebase>
FIREBASE_AUTH_DOMAIN=<do projeto Firebase>
FIREBASE_PROJECT_ID=<do projeto Firebase>
FIREBASE_MESSAGING_SENDER_ID=<do projeto Firebase>
FIREBASE_APP_ID=<do projeto Firebase>
FIREBASE_DATABASE_URL=<do projeto Firebase>
```

Sem as variáveis `FIREBASE_*`, o app abre e valida documentos, mas não entra nem cria conta.

Depois de clonar, instale as dependências com `npm ci`.

## Subir a API HTTP

| Comando | O que faz |
| --- | --- |
| `npm run api:up` | sobe a API num contêiner e mostra o endereço para o celular, como `http://192.168.0.10:3000` |
| `npm run api:down` | para a API e mantém os documentos registrados |
| `npm run api:down -- --volumes` | para a API e apaga os documentos registrados |
| `npm run api:logs` | acompanha o log da API |

O celular e o PC precisam estar no mesmo wifi. Para conferir, abra `<endereço>/saude` no navegador do celular: a resposta é `{"ok":true}`. A documentação das rotas (Swagger) fica em `<endereço>/docs`. Mais detalhes em [`api/README.md`](api/README.md).

## Gerar o APK do Android

```
npm run android:keystore   # só na primeira vez
npm run android:apk
```

O `npm run android:apk` gera o APK de entrega (perfil `preview`): o JavaScript vai dentro do APK, então ele roda sem o Metro. O build roda no PC, sem a nuvem do Expo, e grava o `build-<número>.apk` na raiz do repositório. Instale com `adb install -r build-<número>.apk` ou pelo Expo Orbit.

- **Assinatura:** o `npm run android:keystore` cria, uma vez, a keystore em `../credenciais/` e guarda a senha no `.env.local`. Guarde uma cópia dos dois: sem eles, o próximo APK não instala por cima do anterior.
- **API:** no APK de entrega não há Metro para indicar o PC. Informe o endereço que o `npm run api:up` mostra nas Configurações, ou na própria tela de validação quando ela avisar "Servidor indisponível".
- **Desenvolvimento:** `npm run android:apk -- development` gera o APK que carrega o JavaScript do Metro; ele precisa do `expo-dev-client` instalado.

## Rodar o app

```
npx expo start
```

- **iPhone:** abra pelo Expo Go.
- **Android:** pelo Expo Go, ou pelo APK de desenvolvimento quando o `expo-dev-client` estiver instalado.
- **API:** o app encontra a API pelo IP do PC que roda o Metro. Se usar `npx expo start --tunnel`, defina `ASSINAAQUI_API_URL=http://<ip-do-pc>:3000` no `.env.local`.

## Testes

| Comando | O que roda |
| --- | --- |
| `npm test` | testes do app |
| `npm run typecheck` | checagem de tipos do app |
| `npm run test:api` | testes da API |
| `npm run e2e` | fluxos do Maestro no celular ou no emulador conectado pelo adb (precisa da API no ar e do APK instalado) |

Os fluxos ficam em `.maestro/` e validam documentos pelo código digitado, sem precisar de conta. O `npm run e2e` registra antes um documento de teste na API. Para instalar o Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`.
