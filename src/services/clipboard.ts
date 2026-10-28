import { setStringAsync } from 'expo-clipboard';

export async function copiarTexto(texto: string): Promise<void> {
  await setStringAsync(texto);
}
