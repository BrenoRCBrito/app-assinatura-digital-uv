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

module.exports = ({ config }) => {
  const chaveDoMaps = lerVariavel('GOOGLE_MAPS_ANDROID_KEY');
  const segredoDoCarimbo = lerVariavel('ASSINAAQUI_HMAC_SECRET');
  const firebase = lerConfiguracaoDoFirebase();

  const VARIAVEIS_DO_FIREBASE = {
    apiKey: 'FIREBASE_API_KEY',
    authDomain: 'FIREBASE_AUTH_DOMAIN',
    projectId: 'FIREBASE_PROJECT_ID',
    messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
    appId: 'FIREBASE_APP_ID',
  };

  function lerConfiguracaoDoFirebase() {
    const config = Object.fromEntries(
      Object.entries(VARIAVEIS_DO_FIREBASE).map(([campo, variavel]) => [campo, lerVariavel(variavel)]),
    );
    if (Object.values(config).some((valor) => valor === undefined || valor === '')) {
      return undefined;
    }
    const storageBucket = lerVariavel('FIREBASE_STORAGE_BUCKET');
    return storageBucket === undefined || storageBucket === '' ? config : { ...config, storageBucket };
  }

  return {
    ...config,
    plugins:
      chaveDoMaps === undefined
        ? config.plugins
        : [...config.plugins, ['react-native-maps', { androidGoogleMapsApiKey: chaveDoMaps }]],
    extra: {
      ...config.extra,
      ...(segredoDoCarimbo === undefined ? {} : { hmacSecret: segredoDoCarimbo }),
      ...(firebase === undefined ? {} : { firebase }),
    },
  }
};