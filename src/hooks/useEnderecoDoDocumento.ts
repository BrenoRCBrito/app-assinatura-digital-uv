import { useEffect, useState } from 'react';

import type { LocalAssinatura } from '../domain/documento';
import { consultarEnderecoDoLocal } from '../services/location';

// O endereço gravado na assinatura; para documentos assinados antes dele existir, consulta pelas coordenadas
// (só se a localização já estiver liberada). Nulo enquanto o documento carrega, enquanto consulta ou quando não
// há endereço.
export function useEnderecoDoDocumento(local: LocalAssinatura | null): string | null {
  const endereco = local?.endereco ?? null;
  const latitude = local?.coordenadas.latitude ?? null;
  const longitude = local?.coordenadas.longitude ?? null;
  const [consultado, setConsultado] = useState<string | null>(null);

  useEffect(() => {
    if (endereco !== null || latitude === null || longitude === null) {
      return;
    }
    let ativo = true;
    setConsultado(null);
    void consultarEnderecoDoLocal({ latitude, longitude }).then((resultado) => {
      if (ativo) {
        setConsultado(resultado);
      }
    });
    return () => {
      ativo = false;
    };
  }, [endereco, latitude, longitude]);

  return local === null ? null : (endereco ?? consultado);
}
