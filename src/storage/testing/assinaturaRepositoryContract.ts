import { criarAssinaturaId, criarNomeAssinatura, type Assinatura } from '../../domain/assinatura';
import { createIsoDateTime } from '../../domain/dateTime';
import { criarDesenho, criarTraco } from '../../domain/desenho';
import { createSize } from '../../domain/geometry';
import { criarUsuarioId, type UsuarioId } from '../../domain/usuario';
import type { AssinaturaRepository } from '../repositories';

type OpcoesDoContrato = Readonly<{
  antesDeCada?: () => Promise<void>;
  corromperDados?: () => Promise<void>;
}>;

export const USUARIO_DE_TESTE = criarUsuarioId('1');
export const OUTRO_USUARIO_DE_TESTE = criarUsuarioId('2');

export function criarAssinaturaDeTeste(
  id: string,
  nome: string,
  criadaEm: string,
  usuarioId: UsuarioId = USUARIO_DE_TESTE,
): Assinatura {
  return {
    id: criarAssinaturaId(id),
    usuarioId,
    nome: criarNomeAssinatura(nome),
    desenho: criarDesenho([criarTraco('M10,20 L30,40')], createSize(300, 150)),
    criadaEm: createIsoDateTime(criadaEm),
  };
}

export function testarContratoAssinaturaRepository(
  nome: string,
  criarRepositorio: () => AssinaturaRepository,
  opcoes: OpcoesDoContrato = {},
): void {
  describe(`AssinaturaRepository (${nome})`, () => {
    beforeEach(async () => {
      await opcoes.antesDeCada?.();
    });

    test('list devolve vazio quando nada foi salvo', async () => {
      await expect(criarRepositorio().list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    });

    test('list devolve da mais nova para a mais antiga', async () => {
      const repositorio = criarRepositorio();
      const antiga = criarAssinaturaDeTeste('1', 'Antiga', '2026-09-10T10:00:00.000Z');
      const nova = criarAssinaturaDeTeste('2', 'Nova', '2026-09-12T10:00:00.000Z');

      await repositorio.save(antiga);
      await repositorio.save(nova);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([nova, antiga]);
    });

    test('list só devolve as assinaturas do usuário pedido', async () => {
      const repositorio = criarRepositorio();
      const minha = criarAssinaturaDeTeste('1', 'Minha', '2026-09-10T10:00:00.000Z', USUARIO_DE_TESTE);
      const daOutraConta = criarAssinaturaDeTeste(
        '2',
        'De outra conta',
        '2026-09-12T10:00:00.000Z',
        OUTRO_USUARIO_DE_TESTE,
      );

      await repositorio.save(minha);
      await repositorio.save(daOutraConta);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([minha]);
      await expect(repositorio.list(OUTRO_USUARIO_DE_TESTE)).resolves.toEqual([daOutraConta]);
    });

    test('save substitui a assinatura com o mesmo id', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarAssinaturaDeTeste('1', 'Rascunho', '2026-09-12T10:00:00.000Z'));
      const renomeada = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');

      await repositorio.save(renomeada);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([renomeada]);
    });

    test('delete remove só a assinatura pedida', async () => {
      const repositorio = criarRepositorio();
      const fica = criarAssinaturaDeTeste('1', 'Fica', '2026-09-10T10:00:00.000Z');
      await repositorio.save(fica);
      await repositorio.save(criarAssinaturaDeTeste('2', 'Sai', '2026-09-12T10:00:00.000Z'));

      await repositorio.delete(criarAssinaturaId('2'));

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([fica]);
    });

    test('delete de id inexistente não faz nada', async () => {
      const repositorio = criarRepositorio();
      const assinatura = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');
      await repositorio.save(assinatura);

      await repositorio.delete(criarAssinaturaId('999'));

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([assinatura]);
    });

    test('clear apaga as assinaturas de todas as contas', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarAssinaturaDeTeste('1', 'Minha', '2026-09-10T10:00:00.000Z'));
      await repositorio.save(
        criarAssinaturaDeTeste('2', 'De outra conta', '2026-09-12T10:00:00.000Z', OUTRO_USUARIO_DE_TESTE),
      );

      await repositorio.clear();

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
      await expect(repositorio.list(OUTRO_USUARIO_DE_TESTE)).resolves.toEqual([]);
    });

    const { corromperDados } = opcoes;
    if (corromperDados !== undefined) {
      test('list lança erro quando o dado salvo está corrompido', async () => {
        await corromperDados();

        await expect(criarRepositorio().list(USUARIO_DE_TESTE)).rejects.toThrow();
      });
    }
  });
}
