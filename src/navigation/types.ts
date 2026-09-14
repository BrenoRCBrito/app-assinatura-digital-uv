import type { CapturedPhoto } from '../domain/photo';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Settings: undefined;
  Assinaturas: undefined;
  NovaAssinatura: undefined;
  DigitalizarDocumento: undefined;
  PosicionarAssinatura: { foto: CapturedPhoto };
};
