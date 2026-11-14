# AssinaAqui

App de assinatura digital para iOS e Android, feito com Expo, e a API HTTP que guarda os documentos assinados e confere os códigos de autenticidade.

## Alunos

- Breno Ronan Cadinha de Brito - 202421729
- Adrian Pardal Caldeiras - 2023132122

## Requisitos

- Node 26 (LTS). O `.vfox.toml` fixa a versão para quem usa o vfox.
- Para o APK: JDK 17 (também fixado no `.vfox.toml`), Android SDK em `~/Android/Sdk` (ou em `ANDROID_HOME`) e uma conta Expo logada com `npx eas-cli login`.
- Para a API no PC (opcional, a API já está no ar no Render): Docker ou Podman.
- Para os testes das regras do Firebase e da API no Firestore: Java 17 ou mais novo, para o emulador do Firebase.
- Um arquivo `.env.local` na pasta **acima** do repositório, fora do Git:

```
ASSINAAQUI_API_URL=https://app-assinatura-digital-uv.onrender.com
ASSINAAQUI_HMAC_SECRET=<32 caracteres ou mais>
GOOGLE_MAPS_ANDROID_KEY=<chave do Maps SDK for Android>
FIREBASE_API_KEY=<do projeto Firebase>
FIREBASE_AUTH_DOMAIN=<do projeto Firebase>
FIREBASE_PROJECT_ID=<do projeto Firebase>
FIREBASE_MESSAGING_SENDER_ID=<do projeto Firebase>
FIREBASE_APP_ID=<do projeto Firebase>
FIREBASE_DATABASE_URL=<do projeto Firebase>
```

- `ASSINAAQUI_API_URL` aponta o app para a API. Sem ela, o app procura a API no PC que roda o Metro (veja "Subir a API no PC").
- `ASSINAAQUI_HMAC_SECRET` só é usado pela API no PC; a do Render tem o próprio, no painel.
- Sem as variáveis `FIREBASE_*`, o app abre e valida documentos, mas não entra nem cria conta.
- **Onde fica o arquivo:** o `npx expo start` também lê um `.env.local` na raiz do repositório, mas os scripts (`npm run api:up`, `npm run android:apk`, `npm run android:keystore` e `npm run e2e`) só leem o da pasta acima. Deixe-o na pasta acima para tudo funcionar.

Depois de clonar, instale as dependências:

```
npm ci                                  # app
npm --prefix api ci                     # API: para npm run test:api e para rodá-la sem contêiner
npm --prefix regras-do-firestore ci     # Firebase: para testar e publicar as regras
```

Depois de um `git pull` ou de trocar de branch, rode de novo o `npm ci` se o `package.json` ou o `package-lock.json` tiverem mudado.

## Rodar o app

```
npx expo start
```

- **iPhone:** abra pelo Expo Go.
- **Android:** pelo Expo Go, ou pelo APK de desenvolvimento quando o `expo-dev-client` estiver instalado.
- **API:** com a `ASSINAAQUI_API_URL` no `.env.local`, o app usa a API do Render, e o `npx expo start --tunnel` funciona sem mais nada. Depois de mudar o `.env.local`, reinicie com `npx expo start -c`.
- **Só em desenvolvimento** (Expo Go e `expo start`), as Configurações mostram o endereço da API, para apontar para a API no PC, e o Limpar dados do app. No APK de entrega essas opções não aparecem.

## API HTTP

### No ar, no Render

A API roda em `https://app-assinatura-digital-uv.onrender.com` e grava os registros na coleção `registrosDaApi` do Firestore. Para conferir, abra `<endereço>/saude` no navegador: a resposta é `{"ok":true}`. A documentação das rotas (Swagger) fica em `<endereço>/docs`.

No plano grátis do Render, a API dorme depois de uns 15 minutos parada e leva até um minuto para acordar; o app espera esse tempo. O passo a passo do deploy e as variáveis estão em [`api/README.md`](api/README.md).

### Subir a API no PC

| Comando | O que faz |
| --- | --- |
| `npm run api:up` | sobe a API num contêiner e mostra o endereço para o celular, como `http://192.168.0.10:3000` |
| `npm run api:down` | para a API e mantém os documentos registrados |
| `npm run api:down -- --volumes` | para a API e apaga os documentos registrados |
| `npm run api:logs` | acompanha o log da API |

No PC, a API grava num SQLite em `api/dados`. Para o app usar essa API, tire a `ASSINAAQUI_API_URL` do `.env.local` (o app encontra o PC pelo IP do Metro) ou digite o endereço nas Configurações, em desenvolvimento. O celular e o PC precisam estar no mesmo wifi.

## Firebase: publicar as regras

As regras do Firestore (`firestore.rules`) e do Realtime Database (`database.rules.json`) ficam no repositório. Sempre que elas mudarem, publique **antes** de usar a versão do app que depende delas; sem isso, o que o app novo grava não sobe para a nuvem.

```
npx --prefix regras-do-firestore firebase login
npx --prefix regras-do-firestore firebase deploy --only firestore:rules,database --project assina-aqui
```

O login precisa ser de uma conta com acesso ao projeto `assina-aqui`. Antes de publicar, rode os testes das regras (seção "Testes").

## Gerar o APK do Android

```
npm run android:keystore   # só na primeira vez
npm run android:apk
```

O `npm run android:apk` gera o APK de entrega (perfil `preview`): o JavaScript vai dentro do APK, então ele roda sem o Metro. O build roda no PC, sem a nuvem do Expo, e grava o `build-<número>.apk` na raiz do repositório. Instale com `adb install -r build-<número>.apk` ou pelo Expo Orbit.

- **Assinatura:** o `npm run android:keystore` cria, uma vez, a keystore em `../credenciais/` e guarda a senha no `.env.local`. Guarde uma cópia dos dois: sem eles, o próximo APK não instala por cima do anterior.
- **API:** o APK de entrega já vem apontando para a API do Render, pela `ASSINAAQUI_API_URL` no `env` dos perfis `preview` e `production` do `eas.json`. Para outra API, mude ali e gere o APK de novo.
- **Desenvolvimento:** `npm run android:apk -- development` gera o APK que carrega o JavaScript do Metro; ele precisa do `expo-dev-client` instalado.

## Testes

| Comando | O que roda |
| --- | --- |
| `npm test` | testes do app |
| `npm run typecheck` | checagem de tipos do app |
| `npm run test:api` | testes da API |
| `npm --prefix api run test:firestore` | testes do banco da API contra o emulador do Firestore (precisa de Java) |
| `npm --prefix regras-do-firestore test` | testes das regras do Firestore e do Realtime Database no emulador (precisa de Java) |
| `npm run e2e` | fluxos do Maestro no celular ou no emulador conectado pelo adb, com o APK instalado |

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

Com o emulador ligado e o APK de entrega instalado:

```
npm run e2e
```

O script acorda a API que vai dentro do APK (a do Render, lida do `eas.json`; leva até um minuto no plano grátis), registra nela um documento de teste e roda todos os fluxos. Cada execução deixa um registro "Documento de teste do Maestro" na coleção `registrosDaApi` do Firestore. O que vier depois de `--` vai para o Maestro:

| Comando | O que faz |
| --- | --- |
| `npm run e2e -- --include-tags conta` | roda só os fluxos que entram na conta |
| `npm run e2e -- --exclude-tags conta` | roda só os de validação |
| `npm run e2e -- --format html --output ../relatorio-maestro.html` | gera um relatório em HTML, fora do repositório |
| `API_LOCAL=1 npm run e2e` | usa a API do PC (`npm run api:up`) em vez do Render; só serve com o APK de desenvolvimento, porque o de entrega usa sempre a API do build |

Na janela do emulador dá para acompanhar cada toque. Quando um fluxo falha, o Maestro guarda capturas da tela e o log em `~/.maestro/tests/<data e hora>/`.

### Escrever um fluxo novo

- Com a tela aberta no emulador, `maestro hierarchy` mostra os textos e os `accessibilityLabel` que o `tapOn` encontra. Os rótulos dos campos aparecem em maiúsculas na tela, então `tapOn: "E-mail"` acerta o campo, e não o rótulo.
- Depois de uma ação que depende da rede, espere com `extendedWaitUntil` e um `timeout`, e não com `assertVisible`.
- Um fluxo que precisa de login começa com `runFlow: subflows/entrar-na-conta.yaml` e leva `tags: [conta]`.
- Para digitar um segredo, use `inputText` com `label`: a saída do terminal mostra o rótulo, e não o valor.
- O Maestro não opera a biometria. Assinar um documento pede a confirmação biométrica, então esse caminho ainda não tem fluxo.
