import { criarEnderecoDaApi, type EnderecoDaApi } from './enderecoDaApi';

export type ThemeName = 'light' | 'dark';
export type GestureEngine = 'panResponder' | 'reanimated';

export type Settings = Readonly<{
  theme: ThemeName;
  gestureEngine: GestureEngine;
  salvarCopiaNaGaleria: boolean;
  loginBiometricoAtivado: boolean;
  perguntaBiometriaRespondida: boolean;
  ultimoUsuarioIdBiometria: string | null;
  enderecoDaApi: EnderecoDaApi | null;
}>;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  gestureEngine: 'panResponder',
  salvarCopiaNaGaleria: false,
  loginBiometricoAtivado: false,
  perguntaBiometriaRespondida: false,
  ultimoUsuarioIdBiometria: null,
  enderecoDaApi: null,
};

const THEME_NAMES: readonly ThemeName[] = ['light', 'dark'];
const GESTURE_ENGINES: readonly GestureEngine[] = ['panResponder', 'reanimated'];

function isThemeName(value: unknown): value is ThemeName {
  return THEME_NAMES.some((name) => name === value);
}

function isGestureEngine(value: unknown): value is GestureEngine {
  return GESTURE_ENGINES.some((engine) => engine === value);
}

function lerEnderecoDaApi(value: unknown): EnderecoDaApi | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return criarEnderecoDaApi(value);
  } catch {
    return null;
  }
}

export function parseSettings(data: unknown): Settings {
  if (typeof data !== 'object' || data === null) {
    return DEFAULT_SETTINGS;
  }

  const theme = 'theme' in data ? data.theme : undefined;
  const gestureEngine = 'gestureEngine' in data ? data.gestureEngine : undefined;
  const salvarCopiaNaGaleria = 'salvarCopiaNaGaleria' in data ? data.salvarCopiaNaGaleria : undefined;
  const loginBiometricoAtivado = 'loginBiometricoAtivado' in data ? data.loginBiometricoAtivado : undefined;
  const perguntaBiometriaRespondida =
    'perguntaBiometriaRespondida' in data ? data.perguntaBiometriaRespondida : undefined;
  const ultimoUsuarioIdBiometria =
    'ultimoUsuarioIdBiometria' in data ? data.ultimoUsuarioIdBiometria : undefined;
  const enderecoDaApi = 'enderecoDaApi' in data ? data.enderecoDaApi : undefined;

  return {
    theme: isThemeName(theme) ? theme : DEFAULT_SETTINGS.theme,
    gestureEngine: isGestureEngine(gestureEngine) ? gestureEngine : DEFAULT_SETTINGS.gestureEngine,
    salvarCopiaNaGaleria:
      typeof salvarCopiaNaGaleria === 'boolean' ? salvarCopiaNaGaleria : DEFAULT_SETTINGS.salvarCopiaNaGaleria,
    loginBiometricoAtivado:
      typeof loginBiometricoAtivado === 'boolean' ? loginBiometricoAtivado : DEFAULT_SETTINGS.loginBiometricoAtivado,
    perguntaBiometriaRespondida:
      typeof perguntaBiometriaRespondida === 'boolean'
        ? perguntaBiometriaRespondida
        : DEFAULT_SETTINGS.perguntaBiometriaRespondida,
    ultimoUsuarioIdBiometria:
      typeof ultimoUsuarioIdBiometria === 'string' ? ultimoUsuarioIdBiometria : DEFAULT_SETTINGS.ultimoUsuarioIdBiometria,
    enderecoDaApi: lerEnderecoDaApi(enderecoDaApi),
  };
}
