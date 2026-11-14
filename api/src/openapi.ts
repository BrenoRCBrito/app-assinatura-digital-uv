const campo = {
  type: 'object',
  required: ['chave', 'valor'],
  properties: {
    chave: { type: 'string', pattern: '^[a-z][A-Za-z0-9]*$', example: 'titulo' },
    valor: { type: 'string', example: 'Contrato de locação' },
  },
};

const erro = {
  type: 'object',
  required: ['erro'],
  properties: { erro: { type: 'string', example: 'Campos do documento inválidos.' } },
};

function respostaDeErro(descricao: string) {
  return { description: descricao, content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } };
}

export const documentoOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'API do AssinaAqui',
    version: '0.11.0',
    description:
      'Guarda os documentos assinados pelo app e confere os códigos de autenticidade. ' +
      'Cada registro é carimbado com HMAC-SHA256, e a chave fica só no servidor.',
  },
  tags: [
    { name: 'Documentos', description: 'Registro e consulta pelo código curto' },
    { name: 'Validação', description: 'Conferência dos códigos AA1 impressos antes da API' },
  ],
  paths: {
    '/saude': {
      get: {
        summary: 'Confere se a API está no ar',
        responses: {
          200: {
            description: 'API no ar',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } },
          },
        },
      },
    },
    '/documentos': {
      post: {
        tags: ['Documentos'],
        summary: 'Registra um documento assinado e devolve o código curto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['campos'],
                properties: { campos: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/Campo' } } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Documento registrado',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { codigo: { type: 'string', example: '7K3F-9QXZ-M2P4' } } },
              },
            },
          },
          400: respostaDeErro('Campos inválidos, repetidos ou com a chave reservada `codigo`'),
          413: respostaDeErro('Corpo acima de 16 kB'),
          503: respostaDeErro('Não foi possível gerar um código livre'),
        },
      },
    },
    '/documentos/{codigo}': {
      get: {
        tags: ['Documentos'],
        summary: 'Consulta um documento pelo código curto',
        parameters: [
          {
            name: 'codigo',
            in: 'path',
            required: true,
            description: 'Código curto, com ou sem hífens; minúsculas, O, I e L são aceitos',
            schema: { type: 'string', example: '7K3F-9QXZ-M2P4' },
          },
        ],
        responses: {
          200: {
            description: 'Veredicto do registro: autêntico, com os campos, ou adulterado quando o carimbo não confere',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Veredicto' } } },
          },
          400: respostaDeErro('Código malformado'),
          404: respostaDeErro('Código não encontrado'),
        },
      },
    },
    '/validacoes': {
      post: {
        tags: ['Validação'],
        summary: 'Confere um código AA1 impresso nos PDFs anteriores à API',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo'],
                properties: { codigo: { type: 'string', example: 'AA1;id=1757680000000;email=breno%40exemplo.com#carimbo' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Veredicto: autêntico, adulterado ou ilegível',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Veredicto' } } },
          },
          400: respostaDeErro('Código ausente'),
        },
      },
    },
  },
  components: {
    schemas: {
      Campo: campo,
      Erro: erro,
      Veredicto: {
        type: 'object',
        required: ['veredicto'],
        properties: {
          veredicto: { type: 'string', enum: ['autentico', 'adulterado', 'ilegivel'] },
          campos: { type: 'array', items: { $ref: '#/components/schemas/Campo' } },
          versaoMaisNova: { type: 'boolean', description: 'Só nos códigos AA1: o código veio de um formato mais novo' },
        },
      },
    },
  },
};
