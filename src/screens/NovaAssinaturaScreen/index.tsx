import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthentication } from '../../hooks/useAuthentication';


import {
  Button,
  ChipButton,
  confirm,
  PapelDeAssinatura,
  Row,
  Screen,
  showError,
  showSuccess,
  Stack,
  Text,
  TextField,
} from '../../components';
import { criarAssinaturaId, criarNomeAssinatura, type Assinatura } from '../../domain/assinatura';
import { ValidationError } from '../../domain/brand';
import { createIsoDateTime } from '../../domain/dateTime';
import { recortarDesenho, type Traco } from '../../domain/desenho';
import { lockToLandscape, lockToPortrait } from '../../services/screenOrientation';
import { useRepositories } from '../../storage/RepositoriesProvider';

type NovaAssinaturaScreenProps = Readonly<{
  onSalva: () => void;
}>;

export function NovaAssinaturaScreen({ onSalva }: NovaAssinaturaScreenProps) {
  const { assinaturas } = useRepositories();
  const { usuarioId } = useAuthentication();
  const [nome, setNome] = useState('');
  const [tracos, setTracos] = useState<readonly Traco[]>([]);
  const [deitado, setDeitado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const girandoRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        lockToPortrait().catch((error: unknown) => {
          console.error('Falha ao voltar a tela para retrato:', error);
        });
      };
    }, []),
  );

function montarAssinatura(): Assinatura {
  if (usuarioId === null) {
    throw new ValidationError('Você precisa estar logado para salvar uma assinatura.');
  }
  return {
    id: criarAssinaturaId(),
    usuarioId,
    nome: criarNomeAssinatura(nome),
    desenho: recortarDesenho(tracos),
    criadaEm: createIsoDateTime(new Date().toISOString()),
  };
}

  async function salvar() {
    if (salvandoRef.current) {
      return;
    }
    salvandoRef.current = true;
    setSalvando(true);
    try {
      await assinaturas.save(montarAssinatura());
      showSuccess('Assinatura salva');
      onSalva();
    } catch (error) {
      if (error instanceof ValidationError) {
        showError('Confira a assinatura', error.message);
      } else {
        console.error('Falha ao salvar a assinatura:', error);
        showError('Erro', 'Não foi possível salvar a assinatura.');
      }
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  async function girarPapel() {
    if (girandoRef.current) {
      return;
    }
    girandoRef.current = true;
    try {
      await (deitado ? lockToPortrait() : lockToLandscape());
      setTracos([]);
      setDeitado(!deitado);
    } catch (error) {
      console.error('Falha ao girar a tela:', error);
      showError('Erro', 'Não foi possível girar a tela neste aparelho.');
    } finally {
      girandoRef.current = false;
    }
  }

  function confirmarGiro() {
    if (tracos.length === 0) {
      void girarPapel();
      return;
    }
    confirm({
      title: 'Girar o papel',
      message: 'Girar apaga o desenho atual.',
      confirmLabel: 'Girar',
      onConfirm: () => {
        void girarPapel();
      },
    });
  }

  return (
    <Screen
      preset="form"
      footer={
        <Row gap="actions">
          <Button label="Limpar" onPress={() => setTracos([])} preset="secondary" disabled={salvando} flex={1} />
          <Button label={salvando ? 'Salvando…' : 'Salvar'} onPress={salvar} disabled={salvando} flex={2} />
        </Row>
      }
    >
      <Stack gap="block" flex={1}>
        {deitado ? null : (
          <TextField
            label="Nome"
            accessibilityLabel="Nome da assinatura"
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Rubrica"
            maxLength={40}
          />
        )}
        <Stack gap="label" flex={1}>
          <Row align="center" justify="between">
            <Text preset="sectionLabel">Assinatura</Text>
            <ChipButton
              icon="rotate"
              label={deitado ? 'Voltar ao retrato' : 'Deitar papel'}
              onPress={confirmarGiro}
              disabled={salvando}
            />
          </Row>
          <PapelDeAssinatura tracos={tracos} aoMudarTracos={setTracos} />
        </Stack>
      </Stack>
    </Screen>
  );
}
