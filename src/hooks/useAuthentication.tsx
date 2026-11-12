import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { ValidationError } from '../domain/brand';
import {
  criarCpf,
  criarEmail,
  criarNome,
  criarTelefone,
  criarUsuarioId,
  type Usuario,
  type UsuarioId,
} from '../domain/usuario';
import {
  cadastrarNoFirebase,
  contaDoFirebase,
  entrarNoFirebase,
  mensagemDoErroDeAutenticacao,
  sairDoFirebase,
  type ContaFirebase,
} from '../services/autenticacaoFirebase';
import {
  authenticateDeviceOwner,
  getBiometricStatus,
  type AuthenticationResult,
  type BiometricStatus,
} from '../services/localAuthentication';
import { sincronizarTudo } from '../services/sincronizacao';
import { useRepositories } from '../storage/RepositoriesProvider';
import { useSettings } from '../storage/SettingsProvider';

export type ResultadoLoginComSenha = Readonly<{ ok: true }> | Readonly<{ ok: false; mensagem: string }>;

export type DadosDoCadastro = Readonly<{
  email: string;
  senha: string;
  nome: string;
  cpf: string;
  telefone: string;
}>;

type AuthenticationContextValue = Readonly<{
  isUnlocked: boolean;
  authenticating: boolean;
  biometricStatus: BiometricStatus | null;
  usuarioId: UsuarioId | null;
  mostrarEntrarComBiometria: boolean;
  usuarioBiometria: Usuario | null;
  loginComSenha: (email: string, senha: string) => Promise<ResultadoLoginComSenha>;
  cadastrar: (dados: DadosDoCadastro) => Promise<ResultadoLoginComSenha>;
  unlock: () => Promise<void>;
  sair: () => Promise<void>;
}>;

type AuthenticationErrorType = Exclude<AuthenticationResult['type'], 'authenticated' | 'cancelled'>;

const AUTHENTICATION_ERROR_MESSAGES: Readonly<Record<AuthenticationErrorType, string>> = {
  lockedOut: 'Muitas tentativas. Use a senha do aparelho.',
  unavailable: 'Ative um bloqueio de tela no aparelho.',
  failed: 'Não foi possível autenticar. Tente de novo.',
};

const SESSAO_ENCERRADA = 'Sua sessão terminou. Entre com e-mail e senha.';

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

export function AuthenticationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const repositorios = useRepositories();
  const { usuarios } = repositorios;
  const { settings, updateSettings } = useSettings();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [usuarioId, setUsuarioId] = useState<UsuarioId | null>(null);
  const [usuarioBiometria, setUsuarioBiometria] = useState<Usuario | null>(null);
  // O state só chega à tela no próximo render; a ref barra o segundo toque antes disso.
  const authenticatingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let active = true;

    getBiometricStatus().then((status) => {
        if (active) {
          setBiometricStatus(status);
        }
    });

    return () => {
        active = false;
    };
  }, []);


  useEffect(() => {
    if (usuarioId !== null) {
      void sincronizarTudo(repositorios, usuarioId);
    }
  }, [usuarioId, repositorios]);

  useEffect(() => {
    let active = true;
    const podeMostrar = settings.loginBiometricoAtivado && biometricStatus === 'enrolled';
    const id = settings.ultimoUsuarioIdBiometria as UsuarioId | null;
    if (!podeMostrar || id === null) {
      setUsuarioBiometria(null);
      return;
    }
    usuarios.findById(id).then((encontrado) => {
      if (active) {
        setUsuarioBiometria(encontrado);
      }
    });
    return () => {
      active = false;
    };
  }, [settings.loginBiometricoAtivado, settings.ultimoUsuarioIdBiometria, biometricStatus, usuarios]);


  const perguntarSobreBiometria = useCallback(
  (usuarioLogadoId: UsuarioId) => {
    const jaConfiguradaParaEsseUsuario =
      settingsRef.current.perguntaBiometriaRespondida &&
      settingsRef.current.ultimoUsuarioIdBiometria === usuarioLogadoId;
    if (jaConfiguradaParaEsseUsuario || biometricStatus !== 'enrolled') {
      return;
    }
    Alert.alert('Entrar com biometria', 'Quer usar a biometria do aparelho para entrar da próxima vez?', [
      {
        text: 'Não',
        style: 'cancel',
        onPress: () =>
          updateSettings({
            perguntaBiometriaRespondida: true,
            loginBiometricoAtivado: false,
            ultimoUsuarioIdBiometria: usuarioLogadoId,
          }),
      },
      {
        text: 'Sim',
        onPress: () =>
          updateSettings({
            perguntaBiometriaRespondida: true,
            loginBiometricoAtivado: true,
            ultimoUsuarioIdBiometria: usuarioLogadoId,
          }),
      },
    ]);
  },
  [biometricStatus, updateSettings],
);


  // O Firebase manda a conta; o aparelho guarda o perfil. Se o perfil ainda não existe aqui (primeiro acesso
  // neste aparelho), ele nasce só com o e-mail, e se o e-mail mudou do lado do Firebase, acompanha.
  const garantirUsuarioLocal = useCallback(
    async (conta: ContaFirebase): Promise<Usuario> => {
      const id = criarUsuarioId(conta.uid);
      const email = criarEmail(conta.email);
      const existente = await usuarios.findById(id);
      if (existente === null) {
        return usuarios.create({ id, email });
      }
      return existente.email === email ? existente : usuarios.updateEmail(id, email);
    },
    [usuarios],
  );

  const resultadoDeErro = useCallback((error: unknown, contexto: string, padrao: string): ResultadoLoginComSenha => {
    if (error instanceof ValidationError) {
      return { ok: false, mensagem: error.message };
    }
    const mensagem = mensagemDoErroDeAutenticacao(error);
    if (mensagem !== null) {
      return { ok: false, mensagem };
    }
    console.error(`${contexto}:`, error);
    return { ok: false, mensagem: padrao };
  }, []);

  const loginComSenha = useCallback(
    async (email: string, senha: string): Promise<ResultadoLoginComSenha> => {
      try {
        const conta = await entrarNoFirebase(criarEmail(email), senha);
        const usuario = await garantirUsuarioLocal(conta);
        setUsuarioId(usuario.id);
        setIsUnlocked(true);
        perguntarSobreBiometria(usuario.id);
        return { ok: true };
      } catch (error) {
        return resultadoDeErro(error, 'Falha inesperada ao entrar com e-mail e senha', 'Não foi possível entrar.');
      }
    },
    [garantirUsuarioLocal, perguntarSobreBiometria, resultadoDeErro],
  );

  // Criar a conta já deixa a pessoa logada: o Firebase abre a sessão sozinho, então basta guardar o perfil.
  const cadastrar = useCallback(
    async (dados: DadosDoCadastro): Promise<ResultadoLoginComSenha> => {
      try {
        const email = criarEmail(dados.email);
        const perfil = {
          nome: criarNome(dados.nome),
          cpf: criarCpf(dados.cpf),
          telefone: criarTelefone(dados.telefone),
        };
        const conta = await cadastrarNoFirebase(email, dados.senha);
        let usuario: Usuario;
        try {
          usuario = await usuarios.create({ id: criarUsuarioId(conta.uid), email, ...perfil });
        } catch (error) {
          console.error('Falha ao guardar o perfil da conta nova neste aparelho:', error);
          await sairDoFirebase().catch(() => undefined);
          return {
            ok: false,
            mensagem: 'A conta foi criada, mas não foi possível salvar seus dados neste aparelho. Entre com e-mail e senha.',
          };
        }
        setUsuarioId(usuario.id);
        setIsUnlocked(true);
        perguntarSobreBiometria(usuario.id);
        return { ok: true };
      } catch (error) {
        return resultadoDeErro(error, 'Falha ao criar a conta', 'Não foi possível criar a conta.');
      }
    },
    [perguntarSobreBiometria, resultadoDeErro, usuarios],
  );

  const unlock = useCallback(async () => {
    if (authenticatingRef.current) {
      return;
    }
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      const result = await authenticateDeviceOwner('unlockApp');
      if (result.type === 'authenticated') {
        // A biometria só prova que é o dono do aparelho; quem abre a conta é a sessão guardada do Firebase.
        const conta = await contaDoFirebase();
        if (conta === null || conta.uid !== settingsRef.current.ultimoUsuarioIdBiometria) {
          updateSettings({ loginBiometricoAtivado: false });
          Alert.alert('Não foi possível entrar', SESSAO_ENCERRADA);
        } else {
          const usuario = await garantirUsuarioLocal(conta);
          setUsuarioId(usuario.id);
          setIsUnlocked(true);
        }
      } else if (result.type !== 'cancelled') {
        Alert.alert('Não foi possível entrar', AUTHENTICATION_ERROR_MESSAGES[result.type]);
      }
    } catch (error) {
      console.error('Falha inesperada ao desbloquear o app:', error);
      Alert.alert('Não foi possível entrar', AUTHENTICATION_ERROR_MESSAGES.failed);
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, [garantirUsuarioLocal, updateSettings]);

  // Fechar o app só bloqueia (a sessão fica guardada e a biometria destrava). Sair da conta é o logout de verdade.
  const sair = useCallback(async () => {
    try {
      await sairDoFirebase();
    } catch (error) {
      console.error('Falha ao encerrar a sessão do Firebase:', error);
    }
    setIsUnlocked(false);
    setUsuarioId(null);
    updateSettings({
      loginBiometricoAtivado: false,
      perguntaBiometriaRespondida: false,
      ultimoUsuarioIdBiometria: null,
    });
  }, [updateSettings]);

  const mostrarEntrarComBiometria = settings.loginBiometricoAtivado && biometricStatus === 'enrolled';

  const value = useMemo(
  () => ({
    isUnlocked,
    authenticating,
    biometricStatus,
    usuarioId,
    mostrarEntrarComBiometria,
    usuarioBiometria,
    loginComSenha,
    cadastrar,
    unlock,
    sair,
  }),
  [
    isUnlocked,
    authenticating,
    biometricStatus,
    usuarioId,
    mostrarEntrarComBiometria,
    usuarioBiometria,
    loginComSenha,
    cadastrar,
    unlock,
    sair,
  ],
);

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);
  if (context === null) {
    throw new Error('useAuthentication precisa estar dentro de AuthenticationProvider.');
  }
  return context;
}
