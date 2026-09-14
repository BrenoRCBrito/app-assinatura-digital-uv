import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  Button,
  ChoiceChips,
  confirm,
  LoadingIndicator,
  PalcoDoSelo,
  Screen,
  showError,
  SizeStepper,
  Stack,
  Text,
  TextField,
} from '../../components';
import type { Assinatura, AssinaturaId } from '../../domain/assinatura';
import { createIsoDateTime } from '../../domain/dateTime';
import { formatDateTime, formatPercent } from '../../domain/format';
import type { CapturedPhoto } from '../../domain/photo';
import {
  aumentarSelo,
  diminuirSelo,
  larguraInicialDoSelo,
  podeAumentarSelo,
  podeDiminuirSelo,
  type PosicaoSelo,
} from '../../domain/selo';
import { useRepositories } from '../../storage/RepositoriesProvider';

type PosicionarAssinaturaScreenProps = Readonly<{
  foto: CapturedPhoto;
  onNovaAssinatura: () => void;
}>;

export function PosicionarAssinaturaScreen({ foto, onNovaAssinatura }: PosicionarAssinaturaScreenProps) {
  const { assinaturas: repositorio } = useRepositories();
  const [assinaturas, setAssinaturas] = useState<readonly Assinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [assinaturaId, setAssinaturaId] = useState<AssinaturaId | null>(null);
  const [largura, setLargura] = useState(larguraInicialDoSelo);
  const [posicao, setPosicao] = useState<PosicaoSelo | null>(null);
  const [agora] = useState(() => createIsoDateTime(new Date().toISOString()));
  const perguntouRef = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await repositorio.list();
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
  }, [repositorio]);

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

  const assinatura = assinaturas.find((item) => item.id === assinaturaId);

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
    <Screen
      preset="form"
      footer={
        assinatura === undefined ? undefined : (
          <Stack gap="block">
            <Text preset="supportingCentered">Arraste o selo até a linha de assinatura.</Text>
            <SizeStepper
              label="Tamanho do selo"
              value={formatPercent(largura)}
              canDecrease={podeDiminuirSelo(largura)}
              canIncrease={podeAumentarSelo(largura)}
              decreaseLabel="Diminuir o selo"
              increaseLabel="Aumentar o selo"
              onDecrease={() => setLargura(diminuirSelo)}
              onIncrease={() => setLargura(aumentarSelo)}
            />
          </Stack>
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
        {assinatura === undefined ? null : (
          <PalcoDoSelo
            foto={foto}
            desenho={assinatura.desenho}
            largura={largura}
            linhas={[formatDateTime(agora), 'Local ao assinar']}
            posicao={posicao}
            onMudarPosicao={setPosicao}
          />
        )}
      </Stack>
    </Screen>
  );
}
