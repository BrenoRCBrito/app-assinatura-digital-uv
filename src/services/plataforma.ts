import { Platform } from 'react-native';

export type Plataforma = typeof Platform.OS;

// Fica num módulo à parte para quem só precisa saber a plataforma, como o print.ts, não importar o react-native.
export function plataformaDoAparelho(): Plataforma {
  return Platform.OS;
}
