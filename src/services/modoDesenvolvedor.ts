// Verdadeiro no Expo Go e no expo start; falso no APK de entrega (build de release). Opções de quem desenvolve,
// como o endereço da API e o Limpar dados, só aparecem com ele ligado. Fica numa função para os testes simularem
// o APK de entrega.
export function ehModoDesenvolvedor(): boolean {
  return __DEV__;
}
