import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthentication } from '../../hooks/useAuthentication';

import {
  Button,
  ChoiceChips,
  confirm,
  KeyboardDismissArea,
  LoadingIndicator,
  LoadingOverlay,
  PalcoDoSelo,
  Screen,
  showError,
  showErrorWithSettings,
  SizeStepper,
  Stack,
  Text,
  TextField,
} from '../../components';
import type { Assinatura, AssinaturaId } from '../../domain/assinatura';
import { ValidationError } from '../../domain/brand';
import { createIsoDateTime } from '../../domain/dateTime';
import { criarTituloDocumento, type DocumentoId, type TituloDocumento } from '../../domain/documento';
import { formatDateTime, formatPercent } from '../../domain/format';
import type { Fraction } from '../../domain/geometry';
import type { CapturedPhoto } from '../../domain/photo';
import {
  aumentarSelo,
  diminuirSelo,
  larguraInicialDoSelo,
  larguraMaximaDoSelo,
  limitarLarguraDoSelo,
  podeAumentarSelo,
  podeDiminuirSelo,
  seloNaFoto,
  type PosicaoSelo,
} from '../../domain/selo';
import { useAssinarDocumento } from '../../hooks/useAssinarDocumento';
import { useRepositories } from '../../storage/RepositoriesProvider';
import type { MotivoFalhaAssinatura } from '../../useCases/assinarDocumento';

type PosicionarAssinaturaScreenProps = Readonly<{
  foto: CapturedPhoto;
  onNovaAssinatura: () => void;
  onAssinado: (documentoId: DocumentoId) => void;
}>;

const MENSAGENS_DE_FALHA: Readonly<Record<MotivoFalhaAssinatura, string>> = {
  autenticacaoBloqueada: 'Muitas tentativas. Use a senha do aparelho.',
  autenticacaoIndisponivel: 'Ative um bloqueio de tela no aparelho.',
  autenticacaoFalhou: 'Não foi possível autenticar. Tente de novo.',
  localSemPermissao: 'O local é obrigatório para assinar. Permita o acesso à localização.',
  localIndisponivel: 'Não foi possível obter o local. Tente em área aberta.',
  erroAoGerarDocumento: 'Não foi possível gerar o documento. Tente de novo.',
};

function lerTitulo(texto: string): TituloDocumento | null {
  try {
    return criarTituloDocumento(texto);
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw error;
    }
    showError('Confira o título', error.message);
    return null;
  }
}

export function PosicionarAssinaturaScreen({ foto, onNovaAssinatura, onAssinado }: PosicionarAssinaturaScreenProps) {
  const { assinaturas: repositorio } = useRepositories();
  const { usuarioId } = useAuthentication();
  const { assinando, assinar } = useAssinarDocumento();
  const [assinaturas, setAssinaturas] = useState<readonly Assinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [assinaturaId, setAssinaturaId] = useState<AssinaturaId | null>(null);
  const [largura, setLargura] = useState(larguraInicialDoSelo);
  const [posicao, setPosicao] = useState<PosicaoSelo | null>(null);
  const [agora] = useState(() => createIsoDateTime(new Date().toISOString()));
  const perguntouRef = useRef(false);

  const carregar = useCallback(async () => {
  if (usuarioId === null) {
    return;
  }
  setCarregando(true);
  try {
    const lista = await repositorio.list(usuarioId);
    setAssinaturas(lista);
    setAssinaturaId((atual) => (lista.some((item) => item.id === atual) ? atual : (lista[0]?.id ?? null)));
  } catch (error) {
    console.error('Falha ao carregar as assinaturas:', error);
    perguntouRef.current = true;
    setAssinaturas([]);
    showError('Erro', 'Não foi possível carregar os dados.');
  } finally {
    setCarregando(false);
  }
  }, [repositorio, usuarioId]);


  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  useEffect(() => {
    if (carregando || assinaturas.length > 0 || perguntouRef.current) {
      return;
    }
    perguntouRef.current = true;
    confirm({
      title: 'Nenhuma assinatura salva',
      message: 'Desenhe uma assinatura para posicionar no documento.',
      confirmLabel: 'Nova assinatura',
      onConfirm: onNovaAssinatura,
    });
  }, [assinaturas.length, carregando, onNovaAssinatura]);

  function montarSelo(assinaturaEscolhida: Assinatura) {
    const larguraMaxima = larguraMaximaDoSelo(foto.size, assinaturaEscolhida.desenho.quadro);
    return {
      assinatura: assinaturaEscolhida,
      larguraMaxima,
      largura: limitarLarguraDoSelo(largura, larguraMaxima),
    };
  }

  const escolhida = assinaturas.find((item) => item.id === assinaturaId);
  const selo = escolhida === undefined ? null : montarSelo(escolhida);

  async function assinarDocumento(assinaturaEscolhida: Assinatura, larguraDoSelo: Fraction) {
    const tituloDoDocumento = lerTitulo(titulo);
    if (tituloDoDocumento === null) {
      return;
    }
    const resultado = await assinar({
      titulo: tituloDoDocumento,
      assinatura: assinaturaEscolhida,
      foto,
      selo: seloNaFoto(posicao, larguraDoSelo, foto.size, assinaturaEscolhida.desenho.quadro),
    });
    if (resultado === null || resultado.tipo === 'cancelado') {
      return;
    }
    if (resultado.tipo === 'assinado') {
      onAssinado(resultado.documento.id);
      return;
    }
    if (resultado.motivo === 'localSemPermissao') {
      showErrorWithSettings('Não foi possível assinar', MENSAGENS_DE_FALHA.localSemPermissao);
      return;
    }
    showError('Não foi possível assinar', MENSAGENS_DE_FALHA[resultado.motivo]);
  }

  function escolhaDaAssinatura() {
    if (carregando) {
      return <LoadingIndicator />;
    }
    if (assinaturas.length === 0) {
      return (
        <Stack gap="label">
          <Text preset="supporting">Nenhuma assinatura salva.</Text>
          <Button label="Nova assinatura" icon="plus" onPress={onNovaAssinatura} preset="secondary" />
        </Stack>
      );
    }
    return (
      <ChoiceChips
        options={assinaturas.map((item) => ({ value: item.id, label: item.nome }))}
        selected={assinaturaId}
        onSelect={setAssinaturaId}
        accessibilityLabel="Assinatura"
      />
    );
  }

  return (
    <KeyboardDismissArea>
      <Screen
        preset="form"
        footer={
          selo === null ? undefined : (
            <Button
              label={assinando ? 'Assinando…' : 'Assinar'}
              icon="fingerprint"
              onPress={() => {
                void assinarDocumento(selo.assinatura, selo.largura);
              }}
              disabled={assinando}
            />
          )
        }
      >
        <Stack gap="block" flex={1}>
          <TextField
            label="Título do documento"
            accessibilityLabel="Título do documento"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex.: Contrato de locação"
            maxLength={60}
          />
          <Stack gap="label">
            <Text preset="sectionLabel">Assinatura</Text>
            {escolhaDaAssinatura()}
          </Stack>
          {selo === null ? null : (
            <>
              <PalcoDoSelo
                foto={foto}
                desenho={selo.assinatura.desenho}
                largura={selo.largura}
                linhas={[formatDateTime(agora), 'Local ao assinar']}
                posicao={posicao}
                onMudarPosicao={setPosicao}
              />
              <Text preset="supportingCentered">Arraste o selo até a linha de assinatura.</Text>
              <SizeStepper
                label="Tamanho do selo"
                value={formatPercent(selo.largura)}
                canDecrease={podeDiminuirSelo(selo.largura)}
                canIncrease={podeAumentarSelo(selo.largura, selo.larguraMaxima)}
                decreaseLabel="Diminuir o selo"
                increaseLabel="Aumentar o selo"
                onDecrease={() => setLargura(diminuirSelo(selo.largura))}
                onIncrease={() => setLargura(aumentarSelo(selo.largura, selo.larguraMaxima))}
              />
            </>
          )}
        </Stack>
        <LoadingOverlay visible={assinando} message="Assinando o documento…" />
      </Screen>
    </KeyboardDismissArea>
  );
}
