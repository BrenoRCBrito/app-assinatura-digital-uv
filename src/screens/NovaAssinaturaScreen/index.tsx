import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Toast from 'react-native-toast-message';

import { PrimaryButton } from '../../components/PrimaryButton';
import { criarAssinaturaId, criarNomeAssinatura, type Assinatura } from '../../domain/assinatura';
import { ValidationError } from '../../domain/brand';
import { createIsoDateTime } from '../../domain/dateTime';
import { recortarDesenho, type Traco } from '../../domain/desenho';
import { SignaturePad } from '../../gestures/SignaturePad';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

type NovaAssinaturaScreenProps = Readonly<{
  onSalva: () => void;
}>;

export function NovaAssinaturaScreen({ onSalva }: NovaAssinaturaScreenProps) {
  const { assinaturas } = useRepositories();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [nome, setNome] = useState('');
  const [tracos, setTracos] = useState<readonly Traco[]>([]);
  const [deitado, setDeitado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const girandoRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((error: unknown) => {
          console.error('Falha ao voltar a tela para retrato:', error);
        });
      };
    }, []),
  );

  function montarAssinatura(): Assinatura {
    return {
      id: criarAssinaturaId(),
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
      Toast.show({ type: 'success', text1: 'Assinatura salva' });
      onSalva();
    } catch (error) {
      if (error instanceof ValidationError) {
        Alert.alert('Confira a assinatura', error.message);
      } else {
        console.error('Falha ao salvar a assinatura:', error);
        Alert.alert('Erro', 'Não foi possível salvar a assinatura.');
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
      await ScreenOrientation.lockAsync(
        deitado ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.LANDSCAPE,
      );
      setTracos([]);
      setDeitado(!deitado);
    } catch (error) {
      console.error('Falha ao girar a tela:', error);
      Alert.alert('Erro', 'Não foi possível girar a tela neste aparelho.');
    } finally {
      girandoRef.current = false;
    }
  }

  function confirmarGiro() {
    if (tracos.length === 0) {
      void girarPapel();
      return;
    }
    Alert.alert('Girar o papel', 'Girar apaga o desenho atual.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Girar',
        onPress: () => {
          void girarPapel();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.conteudo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {deitado ? null : (
          <View style={styles.campo}>
            <Text style={styles.rotulo}>Nome</Text>
            <TextInput
              accessibilityLabel="Nome da assinatura"
              maxLength={40}
              onChangeText={setNome}
              placeholder="Ex.: Rubrica"
              placeholderTextColor={theme.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={nome}
            />
          </View>
        )}
        <View style={styles.areaDaAssinatura}>
          <View style={styles.cabecalhoDaAssinatura}>
            <Text style={styles.rotulo}>Assinatura</Text>
            <Pressable
              accessibilityRole="button"
              disabled={salvando}
              onPress={confirmarGiro}
              style={({ pressed }) => [styles.botaoGirar, pressed && styles.botaoGirarPressionado]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
                  stroke={theme.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d="M21 3v5h-5"
                  stroke={theme.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
              <Text style={styles.textoGirar}>{deitado ? 'Voltar ao retrato' : 'Deitar papel'}</Text>
            </Pressable>
          </View>
          <View style={styles.papel}>
            <SignaturePad tracos={tracos} aoMudarTracos={setTracos} />
            <View style={styles.guia}>
              <View style={styles.linhaDaGuia}>
                <Text style={styles.letraDaGuia}>X</Text>
                <View style={styles.tracoDaGuia} />
              </View>
              <Text style={styles.dica}>Assine acima da linha</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <View style={styles.acoes}>
        <View style={styles.acaoLimpar}>
          <PrimaryButton
            label="Limpar"
            onPress={() => setTracos([])}
            theme={theme}
            variant="secondary"
            disabled={salvando}
          />
        </View>
        <View style={styles.acaoSalvar}>
          <PrimaryButton label={salvando ? 'Salvando…' : 'Salvar'} onPress={salvar} theme={theme} disabled={salvando} />
        </View>
      </View>
    </SafeAreaView>
  );
}
