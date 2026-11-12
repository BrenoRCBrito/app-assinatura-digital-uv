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
  const enderecoDaApi = lerVariavel('ASSINAAQUI_API_URL');

  return {
    ...config,
    plugins:
      chaveDoMaps === undefined
        ? config.plugins
        : [...config.plugins, ['react-native-maps', { androidGoogleMapsApiKey: chaveDoMaps }]],
    extra: enderecoDaApi === undefined ? config.extra : { ...config.extra, apiUrl: enderecoDaApi },
  };
};
