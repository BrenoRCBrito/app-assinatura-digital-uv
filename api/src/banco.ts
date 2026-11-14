export type RegistroDoDocumento = Readonly<{
  codigo: string;
  campos: string;
  carimbo: string;
  criadoEm: string;
}>;

// Duas implementações: SQLite num arquivo, para rodar no PC, e Firestore, para a API na nuvem, onde o disco
// do servidor é apagado a cada deploy.
export type Banco = Readonly<{
  // Falso quando o código já existe: quem chama sorteia outro.
  inserir: (registro: RegistroDoDocumento) => Promise<boolean>;
  buscar: (codigo: string) => Promise<RegistroDoDocumento | null>;
  fechar: () => Promise<void>;
}>;
