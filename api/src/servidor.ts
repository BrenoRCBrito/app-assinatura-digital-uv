import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import { criarApp } from './app';
import { abrirBanco } from './banco';
import { criarCarimbo } from './carimbo';
import { enderecosNaRede, lerConfiguracao } from './configuracao';

// Mesmo arquivo que o app.config.js lê: fica no contêiner do repositório, fora do Git, acima das worktrees.
const ARQUIVO_DE_SEGREDOS = join(__dirname, '..', '..', '..', '.env.local');
const PASTA_DOS_DADOS = join(__dirname, '..', 'dados');

function iniciar(): void {
  if (existsSync(ARQUIVO_DE_SEGREDOS)) {
    process.loadEnvFile(ARQUIVO_DE_SEGREDOS);
  }
  const { segredo, porta } = lerConfiguracao(process.env);
  mkdirSync(PASTA_DOS_DADOS, { recursive: true });
  const app = criarApp({
    banco: abrirBanco(join(PASTA_DOS_DADOS, 'assinaaqui.db')),
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
    for (const endereco of enderecosNaRede(networkInterfaces(), porta)) {
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
