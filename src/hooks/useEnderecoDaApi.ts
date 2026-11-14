import { useCallback, useEffect } from 'react';

import { ValidationError } from '../domain/brand';
import { criarEnderecoDaApi, type EnderecoDaApi } from '../domain/enderecoDaApi';
import { acordarServidor, definirEnderecoConfigurado } from '../services/apiDeDocumentos';
import { useSettings } from '../storage/SettingsProvider';

export type ResultadoDoEndereco = Readonly<{ ok: true } | { ok: false; mensagem: string }>;

export function useEnderecoDaApi(): void {
  const { settings } = useSettings();

  useEffect(() => {
    definirEnderecoConfigurado(settings.enderecoDaApi);
    // Com o endereço que vale no lugar, a API grátis do Render começa a acordar enquanto o usuário navega.
    void acordarServidor();
  }, [settings.enderecoDaApi]);
}

export function useSalvarEnderecoDaApi(): (texto: string) => ResultadoDoEndereco {
  const { updateSettings } = useSettings();

  return useCallback(
    (texto: string) => {
      let endereco: EnderecoDaApi | null = null;
      if (texto.trim() !== '') {
        try {
          endereco = criarEnderecoDaApi(texto);
        } catch (error) {
          if (error instanceof ValidationError) {
            return { ok: false, mensagem: error.message };
          }
          throw error;
        }
      }
      // O serviço recebe o endereço já, sem esperar o efeito do useEnderecoDaApi: quem salva costuma tentar de novo em seguida.
      definirEnderecoConfigurado(endereco);
      updateSettings({ enderecoDaApi: endereco });
      return { ok: true };
    },
    [updateSettings],
  );
}
