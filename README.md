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

## Testes de interface com o Maestro

O [Maestro](https://maestro.dev) abre o APK instalado e percorre as telas como um usuário: toca nos botões pelo texto, digita nos campos e confere o que aparece. Os fluxos ficam em `.maestro/`.

| Fluxo | O que confere | Conta |
| --- | --- | --- |
| `validar-documento-registrado.yaml` | digita o código de um documento registrado na API e vê "Documento autêntico" | não |
| `validar-codigo-inexistente.yaml` | digita um código que a API não emitiu e vê "Código não encontrado" | não |
| `navegar-pelo-inicio.yaml` | abre cada item do menu do Início e volta | sim |
| `criar-e-excluir-assinatura.yaml` | desenha uma assinatura, salva e exclui | sim |

### Preparar, uma vez

1. Instale o Maestro, que precisa de Java 17 ou mais novo:

   ```
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Crie um emulador no Android Studio (Virtual Device Manager): Pixel 7, Android 15 (API 35), imagem x86_64 com Google APIs e Graphics em Hardware. Ligue com `emulator -avd <nome> -gpu host`. Um celular com depuração USB, conectado pelo adb, também serve.
3. Gere e instale o APK de entrega, com as variáveis `FIREBASE_*` no `.env.local` (seção "Gerar o APK do Android"): `adb install -r build-<número>.apk`.
4. Crie uma conta só para testes pelo próprio app, em "Criar conta", com um e-mail de teste (como `maestro@example.com`) e um CPF fictício válido. Depois acrescente ao `.env.local`:

   ```
   MAESTRO_EMAIL=maestro@example.com
   MAESTRO_SENHA=<a senha da conta de teste>
   ```

   Sem essas variáveis, o `npm run e2e` avisa e pula os fluxos com a tag `conta`. A conta precisa ser só de testes: os fluxos apagam os dados do app a cada execução, criam e excluem assinaturas nela, e o Maestro guarda o que foi digitado nos registros de `~/.maestro/tests/`.

### Rodar

Com a API no ar (`npm run api:up`) e o emulador ligado:

```
npm run e2e
```

O script registra um documento de teste na API, passa ao app o endereço da API (`http://10.0.2.2:3000` no emulador, o IP do wifi num celular) e roda todos os fluxos. O que vier depois de `--` vai para o Maestro:

| Comando | O que faz |
| --- | --- |
| `npm run e2e -- --include-tags conta` | roda só os fluxos que entram na conta |
| `npm run e2e -- --exclude-tags conta` | roda só os de validação |
| `npm run e2e -- --format html --output ../relatorio-maestro.html` | gera um relatório em HTML, fora do repositório |

Na janela do emulador dá para acompanhar cada toque. Quando um fluxo falha, o Maestro guarda capturas da tela e o log em `~/.maestro/tests/<data e hora>/`.

### Escrever um fluxo novo

- Com a tela aberta no emulador, `maestro hierarchy` mostra os textos e os `accessibilityLabel` que o `tapOn` encontra. Os rótulos dos campos aparecem em maiúsculas na tela, então `tapOn: "E-mail"` acerta o campo, e não o rótulo.
- Depois de uma ação que depende da rede, espere com `extendedWaitUntil` e um `timeout`, e não com `assertVisible`.
- Um fluxo que precisa de login começa com `runFlow: subflows/entrar-na-conta.yaml` e leva `tags: [conta]`.
- Para digitar um segredo, use `inputText` com `label`: a saída do terminal mostra o rótulo, e não o valor.
- O Maestro não opera a biometria. Assinar um documento pede a confirmação biométrica, então esse caminho ainda não tem fluxo.
