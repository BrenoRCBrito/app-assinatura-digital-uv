import { useEffect } from 'react';

import { definirEnderecoConfigurado } from '../services/apiDeDocumentos';
import { useSettings } from '../storage/SettingsProvider';

export function useEnderecoDaApi(): void {
  const { settings } = useSettings();

  useEffect(() => {
    definirEnderecoConfigurado(settings.enderecoDaApi);
  }, [settings.enderecoDaApi]);
}
