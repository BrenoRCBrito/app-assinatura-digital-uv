# API do AssinaAqui

Serviço REST que guarda os documentos assinados e confere os códigos de autenticidade. O app e a API precisam estar na mesma rede wifi.

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

## Endpoints

| Método | Caminho | Uso |
| --- | --- | --- |
| GET | `/saude` | confere se a API está no ar |
| POST | `/documentos` | registra os campos do documento e devolve o código curto |
| GET | `/documentos/:codigo` | consulta pelo código curto |
| POST | `/validacoes` | confere um código AA1 antigo |

A documentação interativa (Swagger UI) fica em `/docs`, e o documento OpenAPI em `/openapi.json`. Com a API no ar, abra `http://<endereço>:3000/docs` no navegador para ver e testar cada rota.

## Testes

`npm run test:api`, na raiz.
