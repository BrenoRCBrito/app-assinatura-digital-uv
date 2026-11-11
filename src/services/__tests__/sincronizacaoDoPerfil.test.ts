import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  criarCpf,
  criarEmail,
  criarNome,
  criarTelefone,
  criarUsuarioId,
  type PerfilParaSincronizar,
} from '../../domain/usuario';
import { createInMemoryUsuarioRepository } from '../../storage/inMemory/inMemoryUsuarioRepository';
import { obterFirestore } from '../firebase';
import { enviarPerfilParaNuvem, perfilParaNuvem, sincronizarPerfil } from '../sincronizacaoDoPerfil';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('../firebase', () => ({ obterFirestore: jest.fn() }));

const ID = criarUsuarioId('uid-a');
const REFERENCIA = { caminho: 'usuarios/uid-a' };
const MARCADOR = { marcador: 'hora-do-servidor' };
const CRIADO = '2026-10-01T10:00:00.000Z';
const ATUALIZADO = '2026-10-02T10:00:00.000Z';

const PERFIL: PerfilParaSincronizar = {
  id: ID,
  email: criarEmail('ana@exemplo.com'),
  nome: criarNome('Ana Souza'),
  cpf: criarCpf('111.444.777-35'),
  telefone: criarTelefone('(11) 98765-4321'),
  createdAt: CRIADO,
  updatedAt: ATUALIZADO,
  deletedAt: null,
};

function nuvemSemPerfil() {
  jest.mocked(getDoc).mockResolvedValue({ exists: () => false, data: () => undefined } as never);
}

function nuvemComPerfil(dados: Readonly<{ createdAt: string; updatedAt: string }>) {
  jest.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => dados } as never);
}

describe('sincronizacaoDoPerfil', () => {
  beforeEach(() => {
    jest.mocked(obterFirestore).mockReset().mockReturnValue({ nome: 'firestore' } as never);
    jest.mocked(doc).mockReset().mockReturnValue(REFERENCIA as never);
    jest.mocked(getDoc).mockReset();
    jest.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    jest.mocked(serverTimestamp).mockReset().mockReturnValue(MARCADOR as never);
  });

  describe('perfilParaNuvem', () => {
    test('leva os campos do contrato das regras, com a hora do servidor', () => {
      expect(perfilParaNuvem(PERFIL)).toEqual({
        email: 'ana@exemplo.com',
        nome: 'Ana Souza',
        cpf: '11144477735',
        telefone: '11987654321',
        createdAt: CRIADO,
        updatedAt: ATUALIZADO,
        deletedAt: null,
        servidorEm: MARCADOR,
      });
    });

    test('perfil sem nome, CPF e telefone vai com null, nunca undefined', () => {
      const dados = perfilParaNuvem({ ...PERFIL, nome: null, cpf: null, telefone: null });

      expect(dados).toMatchObject({ nome: null, cpf: null, telefone: null });
      expect(Object.values(dados)).not.toContain(undefined);
    });
  });

  describe('enviarPerfilParaNuvem', () => {
    test('sem perfil na nuvem, grava em usuarios/{uid}', async () => {
      nuvemSemPerfil();

      await expect(enviarPerfilParaNuvem(PERFIL)).resolves.toBe('enviado');

      expect(doc).toHaveBeenCalledWith({ nome: 'firestore' }, 'usuarios', 'uid-a');
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, perfilParaNuvem(PERFIL));
    });

    test('nuvem com versão mais antiga é substituída', async () => {
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: '2026-10-01T12:00:00.000Z' });

      await expect(enviarPerfilParaNuvem(PERFIL)).resolves.toBe('enviado');

      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test('nuvem com versão mais nova não é sobrescrita: precisa baixar antes', async () => {
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: '2026-10-03T10:00:00.000Z' });

      await expect(enviarPerfilParaNuvem(PERFIL)).resolves.toBe('baixar-antes');

      expect(setDoc).not.toHaveBeenCalled();
    });

    test('perfil de outra origem (createdAt diferente, aparelho novo) não é sobrescrito: precisa baixar antes', async () => {
      nuvemComPerfil({ createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-02T10:00:00.000Z' });

      await expect(enviarPerfilParaNuvem(PERFIL)).resolves.toBe('baixar-antes');

      expect(setDoc).not.toHaveBeenCalled();
    });

    test('nuvem com exatamente esta versão: conta como enviado, sem gastar uma gravação', async () => {
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: ATUALIZADO });

      await expect(enviarPerfilParaNuvem(PERFIL)).resolves.toBe('enviado');

      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('sincronizarPerfil', () => {
    async function repositorioComPerfil() {
      const usuarios = createInMemoryUsuarioRepository();
      await usuarios.create({ id: ID, email: criarEmail('ana@exemplo.com') });
      return usuarios;
    }

    test('envia o perfil pendente de quem está logado e marca como sincronizado', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixarAntes: 0, falhou: false });
      expect(setDoc).toHaveBeenCalledTimes(1);
      await expect(usuarios.listarPerfisPendentes()).resolves.toEqual([]);
    });

    test('não envia o perfil de outra pessoa guardado no aparelho', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, criarUsuarioId('uid-b'));

      expect(resultado).toEqual({ enviados: 0, baixarAntes: 0, falhou: false });
      expect(getDoc).not.toHaveBeenCalled();
      await expect(usuarios.listarPerfisPendentes()).resolves.toHaveLength(1);
    });

    test('sem nada pendente, não fala com a nuvem', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();
      const [pendente] = await usuarios.listarPerfisPendentes();
      await usuarios.marcarPerfilSincronizado(pendente.id, pendente.updatedAt);

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixarAntes: 0, falhou: false });
      expect(getDoc).not.toHaveBeenCalled();
    });

    test('quando a nuvem tem versão mais nova, o perfil continua pendente e é contado em baixarAntes', async () => {
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: '2099-01-01T00:00:00.000Z' });
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixarAntes: 1, falhou: false });
      await expect(usuarios.listarPerfisPendentes()).resolves.toHaveLength(1);
    });

    test('sem internet: não lança, devolve falhou e o perfil continua pendente', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      jest.mocked(getDoc).mockRejectedValue(new Error('Failed to get document because the client is offline.'));
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixarAntes: 0, falhou: true });
      await expect(usuarios.listarPerfisPendentes()).resolves.toHaveLength(1);
      aviso.mockRestore();
    });

    test('se a gravação for recusada, o perfil continua pendente', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      nuvemSemPerfil();
      jest.mocked(setDoc).mockRejectedValue(new Error('permission-denied'));
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      await expect(usuarios.listarPerfisPendentes()).resolves.toHaveLength(1);
      aviso.mockRestore();
    });
  });
});
