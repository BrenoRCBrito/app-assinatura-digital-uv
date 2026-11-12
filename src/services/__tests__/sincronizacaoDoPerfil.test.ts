import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  criarCpf,
  criarEmail,
  criarFotoPerfil,
  criarNome,
  criarTelefone,
  criarUsuarioId,
  type PerfilParaSincronizar,
} from '../../domain/usuario';
import { createInMemoryUsuarioRepository } from '../../storage/inMemory/inMemoryUsuarioRepository';
import { resumirSha256 } from '../crypto';
import { obterFirestore } from '../firebase';
import { baixarFotoDePerfil, enviarFotoDePerfil, removerFotoDePerfil } from '../fotoDePerfilNaNuvem';
import { perfilDaNuvem, perfilParaNuvem, sincronizarPerfil } from '../sincronizacaoDoPerfil';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('../firebase', () => ({ obterFirestore: jest.fn() }));
jest.mock('../crypto', () => ({ resumirSha256: jest.fn() }));
jest.mock('../fotoDePerfilNaNuvem', () => ({
  enviarFotoDePerfil: jest.fn(),
  baixarFotoDePerfil: jest.fn(),
  removerFotoDePerfil: jest.fn(),
}));

const ID = criarUsuarioId('uid-a');
const EMAIL = criarEmail('ana@exemplo.com');
const REFERENCIA = { caminho: 'usuarios/uid-a' };
const MARCADOR = { marcador: 'hora-do-servidor' };
const CRIADO = '2026-10-01T10:00:00.000Z';
const ATUALIZADO = '2026-10-02T10:00:00.000Z';
const MAIS_NOVO = '2026-10-05T10:00:00.000Z';
const FOTO_A = criarFotoPerfil('FOTO-A');
const FOTO_B = criarFotoPerfil('FOTO-B');
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

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
    fotoSha256: null,
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

async function repositorioComPerfil() {
  const usuarios = createInMemoryUsuarioRepository();
  await usuarios.create({ id: ID, email: EMAIL });
  return usuarios;
}

// Perfil já sincronizado, com a foto local indicada.
async function repositorioSincronizadoComFoto(foto: typeof FOTO_A | null) {
  const usuarios = await repositorioComPerfil();
  if (foto !== null) {
    await usuarios.updateFoto(ID, foto);
  }
  await usuarios.marcarPerfilSincronizado(ID, CRIADO);
  return usuarios;
}

describe('sincronizacaoDoPerfil', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(CRIADO) });
    jest.mocked(obterFirestore).mockReset().mockReturnValue({ nome: 'firestore' } as never);
    jest.mocked(doc).mockReset().mockReturnValue(REFERENCIA as never);
    jest.mocked(getDoc).mockReset();
    jest.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    jest.mocked(serverTimestamp).mockReset().mockReturnValue(MARCADOR as never);
    jest
      .mocked(resumirSha256)
      .mockReset()
      .mockImplementation(async (texto: string) => (texto === 'FOTO-A' ? SHA_A : SHA_B));
    jest.mocked(enviarFotoDePerfil).mockReset().mockResolvedValue(undefined);
    jest.mocked(baixarFotoDePerfil).mockReset().mockResolvedValue(FOTO_A);
    jest.mocked(removerFotoDePerfil).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('perfilParaNuvem', () => {
    test('leva os campos do contrato das regras, com a hora do servidor e o resumo da foto', () => {
      expect(perfilParaNuvem(PERFIL, SHA_A)).toEqual({ ...dadosDaNuvem({ fotoSha256: SHA_A }), servidorEm: MARCADOR });
    });

    test('sem foto, o resumo vai como null', () => {
      expect(perfilParaNuvem(PERFIL, null)).toMatchObject({ fotoSha256: null });
    });

    test('perfil sem nome, CPF e telefone vai com null, nunca undefined', () => {
      const dados = perfilParaNuvem({ ...PERFIL, nome: null, cpf: null, telefone: null }, null);

      expect(dados).toMatchObject({ nome: null, cpf: null, telefone: null });
      expect(Object.values(dados)).not.toContain(undefined);
    });
  });

  describe('perfilDaNuvem', () => {
    test('converte o que veio da nuvem para o perfil do app e o resumo da foto', () => {
      expect(perfilDaNuvem(ID, dadosDaNuvem({ fotoSha256: SHA_A }))).toEqual({ perfil: PERFIL, fotoSha256: SHA_A });
    });

    test('perfil gravado antes de a foto subir para a nuvem (sem o campo) conta como sem foto', () => {
      const { fotoSha256: _removido, ...antigo } = dadosDaNuvem();

      expect(perfilDaNuvem(ID, antigo).fotoSha256).toBeNull();
    });

    test('campos nulos continuam nulos', () => {
      expect(perfilDaNuvem(ID, dadosDaNuvem({ nome: null, cpf: null, telefone: null })).perfil).toMatchObject({
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
      ['resumo da foto fora do formato', { fotoSha256: 'ABC' }],
      ['resumo da foto que não é texto', { fotoSha256: 5 }],
    ])('recusa dado da nuvem com %s', (_nome, extra) => {
      expect(() => perfilDaNuvem(ID, dadosDaNuvem(extra))).toThrow();
    });

    test('recusa quando nem objeto é', () => {
      expect(() => perfilDaNuvem(ID, 'texto')).toThrow();
    });
  });

  describe('sincronizarPerfil: texto', () => {
    test('sem perfil na nuvem, envia o pendente em usuarios/{uid} e marca como sincronizado', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();
      const { perfil } = (await usuarios.lerPerfilLocal(ID))!;

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(doc).toHaveBeenCalledWith({ nome: 'firestore' }, 'usuarios', 'uid-a');
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, perfilParaNuvem(perfil, null));
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: false });
    });

    test('perfil novo, sem foto, que ainda não existe na nuvem: não mexe no Realtime Database', async () => {
      nuvemSemPerfil();

      await sincronizarPerfil(await repositorioComPerfil(), ID);

      expect(enviarFotoDePerfil).not.toHaveBeenCalled();
      expect(baixarFotoDePerfil).not.toHaveBeenCalled();
      expect(removerFotoDePerfil).not.toHaveBeenCalled();
    });

    test('nuvem com versão mais antiga é substituída', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: '2026-09-30T10:00:00.000Z' });

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test('nuvem com versão mais nova é baixada para o aparelho, sem gravar nada na nuvem', async () => {
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ updatedAt: MAIS_NOVO, nome: 'Ana Maria' });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({
        perfil: { nome: 'Ana Maria', updatedAt: MAIS_NOVO },
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
      nuvemComPerfil({ updatedAt: MAIS_NOVO, email: 'antigo@exemplo.com' });

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
      const usuarios = await repositorioSincronizadoComFoto(null);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO });

      await expect(sincronizarPerfil(usuarios, ID)).resolves.toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(setDoc).not.toHaveBeenCalled();
    });

    test('perfil sincronizado e sem nada na nuvem: não envia', async () => {
      const usuarios = await repositorioSincronizadoComFoto(null);
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

    test('se a nuvem não responder à gravação, desiste depois de 15 segundos e o perfil continua pendente', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      nuvemSemPerfil();
      jest.mocked(setDoc).mockReturnValue(new Promise<never>(() => undefined));
      const usuarios = await repositorioComPerfil();

      const execucao = sincronizarPerfil(usuarios, ID);
      await jest.advanceTimersByTimeAsync(15000);

      await expect(execucao).resolves.toMatchObject({ falhou: true });
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
      nuvemComPerfil({ updatedAt: MAIS_NOVO, cpf: '11111111111' });
      const usuarios = await repositorioComPerfil();

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ perfil: { cpf: null } });
      aviso.mockRestore();
    });
  });

  describe('sincronizarPerfil: foto', () => {
    test('com foto, a foto sobe para a nuvem antes do perfil, e o perfil leva o resumo dela', async () => {
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();
      await usuarios.updateFoto(ID, FOTO_A);
      const ordem: string[] = [];
      jest.mocked(enviarFotoDePerfil).mockImplementation(async () => {
        ordem.push('foto');
      });
      jest.mocked(setDoc).mockImplementation((async () => {
        ordem.push('perfil');
      }) as never);

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(ordem).toEqual(['foto', 'perfil']);
      expect(enviarFotoDePerfil).toHaveBeenCalledWith(ID, FOTO_A, SHA_A);
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, expect.objectContaining({ fotoSha256: SHA_A }));
    });

    test('se a foto não sobe, o perfil não é gravado e continua pendente (a nuvem nunca aponta para foto que não existe)', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      nuvemSemPerfil();
      const usuarios = await repositorioComPerfil();
      await usuarios.updateFoto(ID, FOTO_A);
      jest.mocked(enviarFotoDePerfil).mockRejectedValue(new Error('sem internet'));

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      expect(setDoc).not.toHaveBeenCalled();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: true });
      aviso.mockRestore();
    });

    test('trocar a foto: o aparelho mais novo sobe a foto nova e o resumo novo', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateFoto(ID, FOTO_B);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(enviarFotoDePerfil).toHaveBeenCalledWith(ID, FOTO_B, SHA_B);
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, expect.objectContaining({ fotoSha256: SHA_B }));
    });

    test('remover a foto: o perfil sobe com resumo null, nada é enviado e a foto é apagada da nuvem', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateFoto(ID, null);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(enviarFotoDePerfil).not.toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, expect.objectContaining({ fotoSha256: null }));
      expect(removerFotoDePerfil).toHaveBeenCalledWith(ID);
    });

    test('a foto só é apagada da nuvem depois de o perfil deixar de apontar para ela', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateFoto(ID, null);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });
      const ordem: string[] = [];
      jest.mocked(setDoc).mockImplementation((async () => {
        ordem.push('perfil');
      }) as never);
      jest.mocked(removerFotoDePerfil).mockImplementation(async () => {
        ordem.push('apagar foto');
      });

      await sincronizarPerfil(usuarios, ID);

      expect(ordem).toEqual(['perfil', 'apagar foto']);
    });

    test('se apagar a foto da nuvem falha, o perfil continua pendente e a próxima sincronização repete', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateFoto(ID, null);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });
      jest.mocked(removerFotoDePerfil).mockRejectedValueOnce(new Error('sem internet'));

      const primeira = await sincronizarPerfil(usuarios, ID);
      const segunda = await sincronizarPerfil(usuarios, ID);

      expect(primeira.falhou).toBe(true);
      expect(segunda).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(removerFotoDePerfil).toHaveBeenCalledTimes(2);
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ pendente: false });
      aviso.mockRestore();
    });

    test('trocar a foto não apaga nada da nuvem: a nova ocupa o lugar da antiga', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateFoto(ID, FOTO_B);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });

      await sincronizarPerfil(usuarios, ID);

      expect(removerFotoDePerfil).not.toHaveBeenCalled();
    });

    test('editar só o texto de um perfil sem foto também limpa uma foto antiga que tenha ficado na nuvem', async () => {
      const usuarios = await repositorioSincronizadoComFoto(null);
      jest.setSystemTime(new Date('2026-10-03T10:00:00.000Z'));
      await usuarios.updateNome(ID, criarNome('Ana Maria'));
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: null });

      await sincronizarPerfil(usuarios, ID);

      expect(removerFotoDePerfil).toHaveBeenCalledWith(ID);
    });

    test('nuvem mais nova com foto diferente: baixa a foto, confere o resumo e grava junto com o texto', async () => {
      const usuarios = await repositorioSincronizadoComFoto(null);
      nuvemComPerfil({ updatedAt: MAIS_NOVO, nome: 'Ana Maria', fotoSha256: SHA_A });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhou: false });
      expect(baixarFotoDePerfil).toHaveBeenCalledWith(ID, SHA_A);
      expect((await usuarios.findById(ID))?.foto).toBe(FOTO_A);
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({
        perfil: { nome: 'Ana Maria' },
        pendente: false,
      });
    });

    test('nuvem mais nova com a mesma foto que já está aqui: não baixa de novo', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      nuvemComPerfil({ updatedAt: MAIS_NOVO, fotoSha256: SHA_A });

      await sincronizarPerfil(usuarios, ID);

      expect(baixarFotoDePerfil).not.toHaveBeenCalled();
      expect((await usuarios.findById(ID))?.foto).toBe(FOTO_A);
    });

    test('nuvem mais nova sem foto (removida em outro aparelho): a foto some daqui também', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      nuvemComPerfil({ updatedAt: MAIS_NOVO, fotoSha256: null });

      await sincronizarPerfil(usuarios, ID);

      expect((await usuarios.findById(ID))?.foto).toBeNull();
      expect(baixarFotoDePerfil).not.toHaveBeenCalled();
    });

    test('aparelho novo: baixa a foto que está na nuvem', async () => {
      jest.setSystemTime(new Date('2026-12-01T10:00:00.000Z'));
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ fotoSha256: SHA_A });

      await sincronizarPerfil(usuarios, ID);

      expect((await usuarios.findById(ID))?.foto).toBe(FOTO_A);
    });

    test('se o download da foto falha, nada é gravado (nem o texto) e a próxima sincronização tenta de novo', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const usuarios = await repositorioComPerfil();
      nuvemComPerfil({ updatedAt: MAIS_NOVO, nome: 'Ana Maria', fotoSha256: SHA_A });
      jest.mocked(baixarFotoDePerfil).mockRejectedValue(new Error('A foto de perfil baixada não confere'));

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado.falhou).toBe(true);
      expect((await usuarios.findById(ID))?.foto).toBeNull();
      await expect(usuarios.lerPerfilLocal(ID)).resolves.toMatchObject({ perfil: { nome: null }, pendente: true });
      aviso.mockRestore();
    });

    test('mesma versão, perfil de antes de a foto subir (nuvem sem resumo): sobe a foto e atualiza o perfil na nuvem', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: null });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: false });
      expect(enviarFotoDePerfil).toHaveBeenCalledWith(ID, FOTO_A, SHA_A);
      expect(setDoc).toHaveBeenCalledWith(REFERENCIA, expect.objectContaining({ fotoSha256: SHA_A, updatedAt: CRIADO }));
    });

    test('mesma versão, nuvem com foto e este aparelho sem: baixa a foto', async () => {
      const usuarios = await repositorioSincronizadoComFoto(null);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhou: false });
      expect((await usuarios.findById(ID))?.foto).toBe(FOTO_A);
    });

    test('mesma versão e mesma foto dos dois lados: não faz nada com a foto', async () => {
      const usuarios = await repositorioSincronizadoComFoto(FOTO_A);
      nuvemComPerfil({ createdAt: CRIADO, updatedAt: CRIADO, fotoSha256: SHA_A });

      const resultado = await sincronizarPerfil(usuarios, ID);

      expect(resultado).toEqual({ enviados: 0, baixados: 0, falhou: false });
      expect(enviarFotoDePerfil).not.toHaveBeenCalled();
      expect(baixarFotoDePerfil).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });
  });
});
