const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// Os segredos ficam fora do Git: o repositório é público.
const ARQUIVO_DE_SEGREDOS = join(__dirname, '..', '.env.local');

function lerDoArquivo(variavel) {
  try {
    const linhas = readFileSync(ARQUIVO_DE_SEGREDOS, 'utf8').split('\n');
    const linha = linhas.find((atual) => atual.trimStart().startsWith(`${variavel}=`));
    return linha === undefined ? undefined : linha.slice(linha.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return undefined;
  }
}

function lerVariavel(variavel) {
  const doAmbiente = process.env[variavel];
  return doAmbiente === undefined || doAmbiente === '' ? lerDoArquivo(variavel) : doAmbiente;
}

const VARIAVEIS_DO_FIREBASE = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
};

const VARIAVEIS_OPCIONAIS_DO_FIREBASE = {
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  databaseURL: 'FIREBASE_DATABASE_URL',
};

// Sem as variáveis obrigatórias o app abre normalmente, só que sem Firebase.
function lerConfiguracaoDoFirebase() {
  const config = Object.fromEntries(
    Object.entries(VARIAVEIS_DO_FIREBASE).map(([campo, variavel]) => [campo, lerVariavel(variavel)]),
  );
  if (Object.values(config).some((valor) => valor === undefined || valor === '')) {
    return undefined;
  }
  const opcionais = Object.entries(VARIAVEIS_OPCIONAIS_DO_FIREBASE)
    .map(([campo, variavel]) => [campo, lerVariavel(variavel)])
    .filter(([, valor]) => valor !== undefined && valor !== '');
  return { ...config, ...Object.fromEntries(opcionais) };
}

module.exports = ({ config }) => {
  const chaveDoMaps = lerVariavel('GOOGLE_MAPS_ANDROID_KEY');
  const enderecoDaApi = lerVariavel('ASSINAAQUI_API_URL');
  const firebase = lerConfiguracaoDoFirebase();

  return {
    ...config,
    plugins:
      chaveDoMaps === undefined
        ? config.plugins
        : [...config.plugins, ['react-native-maps', { androidGoogleMapsApiKey: chaveDoMaps }]],
    extra: {
      ...config.extra,
      ...(enderecoDaApi === undefined ? {} : { apiUrl: enderecoDaApi }),
      ...(firebase === undefined ? {} : { firebase }),
    },
  };
};