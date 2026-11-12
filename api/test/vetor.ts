export const SEGREDO_DO_VETOR = 'segredo-de-teste-com-pelo-menos-32-caracteres';

// Gerado em 2026-11-11 pelo emitirCodigo e pelo HMAC do app da v0.9.0, com o segredo acima: prende a
// compatibilidade com os QR AA1 que o app imprimiu antes da API existir.
export const CODIGO_IMPRESSO_PELO_APP =
  'AA1;id=1757680000000;email=breno%40exemplo.com;cpf=***.456.789-**;telefone=(**)%20*****-4321;titulo=Contrato%20n%C2%BA%207%3B%20aluguel%20%3D%20100%25%20%232;em=2026-09-12T14%3A32%3A00.000Z;local=-22.40418%2C-43.66283;foto=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#N6CH7zbIWLnF1bwQCX0dpafOSdbx5m5qB42qljlMst8';

export const CAMPOS_DO_VETOR = [
  { chave: 'id', valor: '1757680000000' },
  { chave: 'email', valor: 'breno@exemplo.com' },
  { chave: 'cpf', valor: '***.456.789-**' },
  { chave: 'telefone', valor: '(**) *****-4321' },
  { chave: 'titulo', valor: 'Contrato nº 7; aluguel = 100% #2' },
  { chave: 'em', valor: '2026-09-12T14:32:00.000Z' },
  { chave: 'local', valor: '-22.40418,-43.66283' },
  { chave: 'foto', valor: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
];
