import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { criarApp } from './app';
import type { Banco } from './banco';
import { abrirBancoFirestore, COLECAO_DOS_REGISTROS } from './bancoFirestore';
import { abrirBancoSqlite } from './bancoSqlite';
import { criarCarimbo } from './carimbo';
import { enderecosNaRede, lerConfiguracao, type ContaDeServico } from './configuracao';

// Mesmo arquivo que o app.config.js lê: fica no contêiner do repositório, fora do Git, acima das worktrees.
const ARQUIVO_DE_SEGREDOS = join(__dirname, '..', '..', '..', '.env.local');
const PASTA_DOS_DADOS = join(__dirname, '..', 'dados');

function abrirBanco(contaDeServico: ContaDeServico | null): Banco {
  if (contaDeServico === null) {
    mkdirSync(PASTA_DOS_DADOS, { recursive: true });
    console.log('Registros no SQLite, em api/dados.');
    return abrirBancoSqlite(join(PASTA_DOS_DADOS, 'assinaaqui.db'));
  }
  const firebase = initializeApp({ credential: cert(contaDeServico) });
  console.log(`Registros no Firestore do projeto ${contaDeServico.projectId}, coleção ${COLECAO_DOS_REGISTROS}.`);
  return abrirBancoFirestore(getFirestore(firebase));
}

function iniciar(): void {
  if (existsSync(ARQUIVO_DE_SEGREDOS)) {
    process.loadEnvFile(ARQUIVO_DE_SEGREDOS);
  }
  const { segredo, porta, enderecoNaRede, contaDeServico } = lerConfiguracao(process.env);
  const app = criarApp({
    banco: abrirBanco(contaDeServico),
    carimbo: criarCarimbo(segredo),
    gerarBytes: (quantidade) => randomBytes(quantidade),
    agora: () => new Date(),
  });
  app.listen(porta, '0.0.0.0', (erro) => {
    if (erro !== undefined) {
      console.error(`Não foi possível abrir a porta ${porta}:`, erro.message);
      process.exitCode = 1;
      return;
    }
    console.log(`API do AssinaAqui na porta ${porta}. No celular, use um destes endereços:`);
    // No contêiner, as interfaces são as da rede do Docker: o script de subida informa o IP do PC.
    const enderecos = enderecoNaRede === null ? enderecosNaRede(networkInterfaces(), porta) : [enderecoNaRede];
    for (const endereco of enderecos) {
      console.log(`  ${endereco}`);
    }
  });
}

try {
  iniciar();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
