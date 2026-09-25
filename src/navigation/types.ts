import type { DocumentoId } from '../domain/documento';
import type { CapturedPhoto } from '../domain/photo';

export type RootStackParamList = {
  Login: undefined;
  CriarConta: undefined;
  Home: undefined;
  Settings: undefined;
  Profile: undefined;
  Assinaturas: undefined;
  NovaAssinatura: undefined;
  DigitalizarDocumento: undefined;
  PosicionarAssinatura: { foto: CapturedPhoto };
  Historico: undefined;
  Documento: { documentoId: DocumentoId };
  ValidarDocumento: undefined;
};
