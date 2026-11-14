# API do AssinaAqui

Serviço REST que guarda os documentos assinados e confere os códigos de autenticidade. Roda no Render, gravando no Firestore, ou no PC, gravando num SQLite em `api/dados`. No PC, o app e a API precisam estar na mesma rede wifi.

## Subir e derrubar

Na raiz do repositório, com Docker ou Podman instalado:

| Comando | O que faz |
| --- | --- |
| `npm run api:up` | monta a imagem, sobe o contêiner, espera a API responder e mostra o endereço para o celular |
| `npm run api:down` | para o contêiner e mantém os documentos registrados |
| `npm run api:down -- --volumes` | para o contêiner e apaga os documentos registrados |
| `npm run api:logs` | acompanha o log do contêiner |

Os scripts usam o Podman quando ele está instalado e, senão, o Docker. Para escolher um deles, defina `CONTAINER_ENGINE=docker` ou `CONTAINER_ENGINE=podman`. A porta padrão é a 3000; para usar outra, defina `PORT`.

Sem contêiner, para desenvolver: `npm --prefix api ci` uma vez e depois `npm run api`.

## Configuração

O segredo do carimbo fica no `.env.local` um nível acima do repositório, o mesmo arquivo que o `app.config.js` lê:

```
ASSINAAQUI_HMAC_SECRET=<32 caracteres ou mais>
```

O `npm run api:up` passa só essa variável para o contêiner.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `ASSINAAQUI_HMAC_SECRET` | sim | segredo do carimbo; o mesmo valor mantém válidos os códigos já emitidos |
| `FIREBASE_SERVICE_ACCOUNT` | não | JSON da conta de serviço do Firebase. Com ela, os registros vão para a coleção `registrosDaApi` do Firestore; sem ela, para o SQLite em `api/dados` |
| `PORT` | não | porta; o Render define sozinho |

A conta de serviço dá acesso total ao projeto Firebase: ela vai só no painel do Render, nunca no repositório, que é público. As regras do Firestore não liberam `registrosDaApi` para o app.

## Deploy no Render

1. Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada. Baixa um JSON.
2. Render > New > Web Service > Public Git Repository, com a URL do repositório no GitHub.
3. Runtime `Docker`, Root Directory `api`, Health Check Path `/saude`, região Virginia (US East).
4. Environment Variables: `ASSINAAQUI_HMAC_SECRET` e `FIREBASE_SERVICE_ACCOUNT` (cole o conteúdo inteiro do JSON).
5. No log do deploy deve aparecer `Registros no Firestore do projeto ...`. Confira em `https://<servico>.onrender.com/saude`.
6. No app, aponte para o Render com `ASSINAAQUI_API_URL=https://<servico>.onrender.com` no `.env.local` e no `env` dos perfis do `eas.json`, ou digite o endereço nas Configurações do app.

No plano grátis a API dorme depois de uns 15 minutos parada e leva até um minuto para acordar: o app chama `/saude` ao abrir e quando o endereço muda, e espera até 60 s por resposta. Repositório público conectado pela URL não tem deploy automático; use Manual Deploy ou o Deploy Hook do serviço.

## Endpoints

| Método | Caminho | Uso |
| --- | --- | --- |
| GET | `/saude` | confere se a API está no ar |
| POST | `/documentos` | registra os campos do documento e devolve o código curto |
| GET | `/documentos/:codigo` | consulta pelo código curto |
| POST | `/validacoes` | confere um código AA1 antigo |

A documentação interativa (Swagger UI) fica em `/docs`, e o documento OpenAPI em `/openapi.json`. Com a API no ar, abra `http://<endereço>:3000/docs` no navegador para ver e testar cada rota.

## Testes

`npm run test:api`, na raiz. Os testes do banco no Firestore rodam no emulador com `npm run test:firestore`, na pasta `api`; precisa de Java e de um `npm ci` na pasta `regras-do-firestore`.
