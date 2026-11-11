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
import { perfilDaNuvem, perfilParaNuvem, sincronizarPerfil } from '../sincronizacaoDoPerfil';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('../firebase', () => ({ obterFirestore: jest.fn() }));

const ID = criarUsuarioId('uid-a');
const EMAIL = criarEmail('ana@exemplo.com');
const REFERENCIA = { caminho: 'usuarios/uid-a' };
const MARCADOR = { marcador: 'hora-do-servidor' };
const CRIADO = '2026-10-01T10:00:00.000Z';
const ATUALIZADO = '2026-10-02T10:00:00.000Z';

const PERFIL: PerfilParaSincronizar = {
  id: ID,
  email: EMAIL,
  nome: criarNome('Ana Souza'),
  cpf: criarCpf('111.444.777-35'),
  telefone: criarTelefone('(11) 98765-4321'),
  createdAt: CRIADO,
  updatedAt: ATUALIZADO,
  deletedAt: null,
};

function dadosDaNuvem(extra: Readonly<Record<string, unknown>> = {}) {
  return {
    email: 'ana@exemplo.com',
    nome: 'Ana Souza',
    cpf: '11144477735',
    telefone: '11987654321',
    createdAt: CRIADO,
    updatedAt: ATUALIZADO,
    deletedAt: null,
    ...extra,
  };
}

function nuvemSemPerfil() {
  jest.mocked(getDoc).mockResolvedValue({ exists: () => false, data: () => undefined } as never);
}

function nuvemComPerfil(extra: Readonly<Record<string, unknown>> = {}) {
  jest.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => dadosDaNuvem(extra) } as never);
}

describe('sincronizacaoDoPerfil', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(CRIADO) });
    jest.mocked(obterFirestore).mockReset().mockReturnValue({ nome: 'firestore' } as never);
    jest.mocked(doc).mockReset().mockReturnValue(REFERENCIA as never);
    jest.mocked(getDoc).mockReset();
    jest.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    jest.mocked(serverTimestamp).mockReset().mockReturnValue(MARCADOR as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('perfilParaNuvem', () => {
    test('leva os campos do contrato das regras, com a hora do servidor', () => {
      expect(perfilParaNuvem(PERFIL)).toEqual({ ...dadosDaNuvem(), servidorEm: MARCADOR });
    });

    test('perfil sem nome, CPF e telefone vai com null, nunca undefined', () => {
      const dados = perfilParaNuvem({ ...PERFIL, nome: null, cpf: null, telefone: null });

      expect(dados).toMatchObject({ nome: null, cpf: null, telefone: null });
      expect(Object.values(dados)).not.toContain(undefined);
    });
  });

  describe('perfilDaNuvem', () => {
    test('converte o que veio da nuvem para o perfil do app', () => {
      expect(perfilDaNuvem(ID, dadosDaNuvem())).toEqual(PERFIL);
    });

    test('campos nulos continuam nulos', () => {
      expect(perfilDaNuvem(ID, dadosDaNuvem({ nome: null, cpf: null, telefone: null }))).toMatchObject({
        nome: null,
        cpf: null,
        telefone: null,
      });
    });

    test.each([
      ['CPF inválido', { cpf: '11111111111' }],
      ['e-mail inválido', { email: 'sem-arroba' }],
      ['sem e-mail', { email: undefined }],
      ['data que não é texto', { updatedAt: 123 }],
      ['sem data de criação', { createdAt: undefined }],
    ])('recusa dado da nuvem com %s', (_nome, extra) => {
      expect(() => perfilDaNuvem(ID, dadosDaNuvem(extra))).toThrow();
    });

    test('recusa quando nem objeto é', () => {
      expect(() => perfilDaNuvem(ID, 'texto')).toThrow();
    });
  });

  describe('sincronizarPerfil', () => {
    async function repositorioComPerfil() {
      const usuarios = createInMemoryUsuarioRepository();
      await usuarios.create({ id: ID, email: EMAIL });
      return usuarios;
    }

    test('sem perfil na nuvem, envia o pendente em usuarios/{uid} e marca como sincronizado', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();
      const { perfil } = (await usuarios.lerPerfilLocal(ID))!;

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(doc).toHaveBeenCalledWith({ nome: 'firestore' }, 'usuarios', 'uid-a');
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, perfilParaNuvem(perfil));
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: false });
    });

    test('nuvem com versão mais antiga é substituída', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: '2026-09-30T10:00:00.000Z' });

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test('nuvem com versão mais nova é baixada para o aparelho, sem gravar nada na nuvem', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ updatedAt: '2026-10-05T10:00:00.000Z', nome: 'Ana Maria' });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({
        perfil: { nome: 'Ana Maria', updatedAt: '2026-10-05T10:00:00.000Z' },
        pendente: false,
      });
    });

    test('aparelho novo: perfil criado só com o e-mail cede ao da nuvem (createdAt diferente)', async () => {
      jest.setSystemTime(new Date('2026-12-01T10:00:00.000Z'));
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({
        perfil: { nome: 'Ana Souza', cpf: '11144477735', telefone: '11987654321', createdAt: CRIADO },
        pendente: false,
      });
    });

    test('baixar mantém o e-mail do aparelho: quem manda no e-mail é o login', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ updatedAt: '2026-10-05T10:00:00.000Z', email: 'antigo@exemplo.com' });

      await sincronizarPerfil(usuarios, ID);

      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ perfil: { email: EMAIL } });
    });

    test('nuvem com exatamente a mesma versão: só marca como sincronizado, sem gravar', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: false });
    });

    test('perfil já sincronizado e igual ao da nuvem: não faz nada', async () => {
      const usuarios = await repositorioComPerfil();
      await usuarios.marcarPerfilSincronizado(ID, CRIADO);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO });

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
    });

    test('perfil sincronizado e sem nada na nuvem: não envia', async () => {
      const usuarios = await repositorioComPerfil();
      await usuarios.marcarPerfilSincronizado(ID, CRIADO);
      nuvemSemPerfil();

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
    });

    test('perfil que não existe neste aparelho: não fala com a nuvem', async () => {
      const usuarios = createInMemoryUsuarioRepository();

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(getDoc).not.toHaveBeenCalled();
    });

    test('sem internet: não lança, devolve falhou e o perfil continua pendente', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      jest.mocked(getDoc).mockRejectedValue(new Error('Failed to get document because the client is offline.'));
      const usuarios = await repositorioComPerfil();

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 0, baixados: 0, falhou: true });
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: true });
      aviso.mockRestore();
    });

    test('se a gravação for recusada, o perfil continua pendente', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      nuvemSemPerfil();
      jest.mocked(setDoc).mockRejectedValue(new Error('permission-denied'));
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: true });
      aviso.mockRestore();
    });

    test('dado inválido na nuvem não é gravado no aparelho: devolve falhou', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      nuvemComPerfil({ updatedAt: '2026-10-05T10:00:00.000Z', cpf: '11111111111' });
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ perfil: { cpf: null } });
      aviso.mockRestore();
    });
  });
});
