const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// A chave do Google Maps fica fora do Git: o repositório é público.
const ARQUIVO_DE_SEGREDOS = join(__dirname, '..', '.env.local');
const VARIAVEL_DA_CHAVE = 'GOOGLE_MAPS_ANDROID_KEY';

function lerDoArquivo(variavel) {
  try {
    const linhas = readFileSync(ARQUIVO_DE_SEGREDOS, 'utf8').split('\n');
    const linha = linhas.find((atual) => atual.trimStart().startsWith(`${variavel}=`));
    return linha === undefined ? undefined : linha.slice(linha.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return undefined;
  }
}

function chaveDoGoogleMaps() {
  const doAmbiente = process.env[VARIAVEL_DA_CHAVE];
  return doAmbiente === undefined || doAmbiente === '' ? lerDoArquivo(VARIAVEL_DA_CHAVE) : doAmbiente;
}

module.exports = ({ config }) => {
  const chave = chaveDoGoogleMaps();
  if (chave === undefined) {
    return config;
  }
  return { ...config, plugins: [...config.plugins, ['react-native-maps', { androidGoogleMapsApiKey: chave }]] };
};
