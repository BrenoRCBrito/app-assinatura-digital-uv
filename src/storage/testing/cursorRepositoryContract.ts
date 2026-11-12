import { criarUsuarioId } from '../../domain/usuario';
import type { CursorRepository } from '../repositories';

const ANA = criarUsuarioId('uid-ana');
const BETO = criarUsuarioId('uid-beto');

export function testarContratoCursorRepository(
  nome: string,
  criarRepositorio: () => CursorRepository,
  antesDeCada: () => void | Promise<void> = () => undefined,
): void {
  describe(`CursorRepository (${nome})`, () => {
    beforeEach(async () => {
      await antesDeCada();
    });

    test('sem nada gravado, devolve null', async () => {
      await expect(criarRepositorio().ler(ANA, 'documentos')).resolves.toBeNull();
    });

    test('guarda os segundos e os nanossegundos', async () => {
      const repositorio = criarRepositorio();

      await repositorio.gravar(ANA, 'documentos', { segundos: 1790000000, nanos: 123456789 });

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toEqual({ segundos: 1790000000, nanos: 123456789 });
    });

    test('gravar de novo substitui o cursor anterior', async () => {
      const repositorio = criarRepositorio();
      await repositorio.gravar(ANA, 'documentos', { segundos: 1, nanos: 1 });

      await repositorio.gravar(ANA, 'documentos', { segundos: 2, nanos: 0 });

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toEqual({ segundos: 2, nanos: 0 });
    });

    test('cada coleção e cada conta tem o seu cursor', async () => {
      const repositorio = criarRepositorio();
      await repositorio.gravar(ANA, 'documentos', { segundos: 1, nanos: 0 });
      await repositorio.gravar(ANA, 'assinaturas', { segundos: 2, nanos: 0 });
      await repositorio.gravar(BETO, 'documentos', { segundos: 3, nanos: 0 });

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toEqual({ segundos: 1, nanos: 0 });
      await expect(repositorio.ler(ANA, 'assinaturas')).resolves.toEqual({ segundos: 2, nanos: 0 });
      await expect(repositorio.ler(BETO, 'documentos')).resolves.toEqual({ segundos: 3, nanos: 0 });
      await expect(repositorio.ler(BETO, 'assinaturas')).resolves.toBeNull();
    });

    test('apagarDaConta apaga os cursores de todas as coleções da conta e deixa os das outras', async () => {
      const repositorio = criarRepositorio();
      await repositorio.gravar(ANA, 'documentos', { segundos: 1, nanos: 0 });
      await repositorio.gravar(ANA, 'assinaturas', { segundos: 2, nanos: 0 });
      await repositorio.gravar(BETO, 'documentos', { segundos: 3, nanos: 0 });

      await repositorio.apagarDaConta(ANA);

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toBeNull();
      await expect(repositorio.ler(ANA, 'assinaturas')).resolves.toBeNull();
      await expect(repositorio.ler(BETO, 'documentos')).resolves.toEqual({ segundos: 3, nanos: 0 });
    });

    test('depois de apagar o cursor, a conta começa a baixar tudo de novo (cursor vazio)', async () => {
      const repositorio = criarRepositorio();
      await repositorio.gravar(ANA, 'documentos', { segundos: 1, nanos: 0 });
      await repositorio.apagarDaConta(ANA);

      await repositorio.gravar(ANA, 'documentos', { segundos: 9, nanos: 0 });

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toEqual({ segundos: 9, nanos: 0 });
    });

    test('clear apaga todos os cursores', async () => {
      const repositorio = criarRepositorio();
      await repositorio.gravar(ANA, 'documentos', { segundos: 1, nanos: 0 });

      await repositorio.clear();

      await expect(repositorio.ler(ANA, 'documentos')).resolves.toBeNull();
    });
  });
}
