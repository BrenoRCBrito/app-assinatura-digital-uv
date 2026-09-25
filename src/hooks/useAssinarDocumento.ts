import { useCallback, useMemo, useRef, useState } from 'react';

import { createIsoDateTime } from '../domain/dateTime';
import { criarDocumentoId } from '../domain/documento';
import { carimbarComOSegredoDoApp } from '../services/carimbo';
import {
  copiarFotoDocumento,
  excluirArquivosDocumento,
  guardarPdfDocumento,
  lerFotoDocumentoBase64,
} from '../services/fileSystem';
import { resumirSha256 } from '../services/hmac';
import { authenticateDeviceOwner } from '../services/localAuthentication';
import { obterLocalAssinatura } from '../services/location';
import { gerarPdf, montarHtmlDocumento } from '../services/print';
import { useRepositories } from '../storage/RepositoriesProvider';
import {
  assinarDocumento,
  type DependenciasAssinatura,
  type PedidoAssinatura,
  type ResultadoAssinatura,
} from '../useCases/assinarDocumento';
import { emitirCodigoDoDocumento } from '../useCases/emitirCodigoDoDocumento';
import { useAuthentication } from './useAuthentication';

export type AssinarDocumento = Readonly<{
  assinando: boolean;
  assinar: (pedido: PedidoAssinatura) => Promise<ResultadoAssinatura | null>;
}>;

export function useAssinarDocumento(): AssinarDocumento {
  const { documentos, usuarios } = useRepositories();
  const { usuarioId } = useAuthentication();
  const [assinando, setAssinando] = useState(false);
  // O state só chega à tela no próximo render; a ref barra o segundo toque antes disso.
  const assinandoRef = useRef(false);

  const dependencias = useMemo<DependenciasAssinatura | null>(
    () =>
      usuarioId === null
        ? null
        : {
            authenticateDeviceOwner,
            obterLocalAssinatura,
            copiarFotoDocumento,
            lerFotoDocumentoBase64,
            emitirCodigo: (documento, fotoBase64) =>
              emitirCodigoDoDocumento(
                { buscarUsuario: (id) => usuarios.findById(id), resumirSha256, carimbar: carimbarComOSegredoDoApp },
                documento,
                fotoBase64,
              ),
            guardarPdfDocumento,
            excluirArquivosDocumento,
            montarHtmlDocumento,
            gerarPdf,
            documentos,
            agora: () => createIsoDateTime(new Date().toISOString()),
            criarDocumentoId: () => criarDocumentoId(),
            usuarioId,
          },
    [documentos, usuarios, usuarioId],
  );

  const assinar = useCallback(
    async (pedido: PedidoAssinatura) => {
      if (assinandoRef.current || dependencias === null) {
        return null;
      }
      assinandoRef.current = true;
      setAssinando(true);
      try {
        return await assinarDocumento(dependencias, pedido);
      } finally {
        assinandoRef.current = false;
        setAssinando(false);
      }
    },
    [dependencias],
  );

  return { assinando, assinar };
}
