import React from 'react';

import {
  Button,
  Card,
  confirmDestructive,
  Screen,
  Section,
  SegmentedControl,
  showError,
  showSuccess,
  Stack,
  ToggleRow,
  type SegmentOption,
} from '../../components';
import type { GestureEngine, ThemeName } from '../../domain/settings';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useSettings } from '../../storage/SettingsProvider';

const THEME_OPTIONS: readonly SegmentOption<ThemeName>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const GESTURE_ENGINE_OPTIONS: readonly SegmentOption<GestureEngine>[] = [
  { value: 'panResponder', label: 'PanResponder' },
  { value: 'reanimated', label: 'Reanimated' },
];

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { assinaturas, documentos, usuarios } = useRepositories();
  const { lock } = useAuthentication();

  async function limparDados() {
    try {
      await assinaturas.clear();
      await documentos.clear();
      await usuarios.clear();
      updateSettings({
        loginBiometricoAtivado: false,
        perguntaBiometriaRespondida: false,
        ultimoUsuarioIdBiometria: null,
      });
      showSuccess('Dados do app apagados.');
      lock();
    } catch (error) {
      console.error('Falha ao limpar os dados do app:', error);
      showError('Erro', 'Não foi possível limpar os dados.');
    }
  }

  function confirmarLimpeza() {
    confirmDestructive({
      title: 'Limpar dados do app',
      message: 'Apaga as assinaturas, os documentos e as contas deste aparelho. Não dá para desfazer.',
      confirmLabel: 'Limpar',
      onConfirm: () => {
        void limparDados();
      },
    });
  }

  return (
    <Screen preset="scroll">
      <Stack gap="block">
        <Section label="Aparência">
          <Card title="Tema" description="Muda as cores do app. Documentos e PDFs continuam em papel claro.">
            <SegmentedControl
              options={THEME_OPTIONS}
              selected={settings.theme}
              onSelect={(themeName) => updateSettings({ theme: themeName })}
            />
          </Card>
        </Section>

        <Section label="Gestos">
          <Card title="Motor de gestos" description="Define como o selo é arrastado sobre o documento.">
            <SegmentedControl
              options={GESTURE_ENGINE_OPTIONS}
              selected={settings.gestureEngine}
              onSelect={(gestureEngine) => updateSettings({ gestureEngine })}
            />
          </Card>
        </Section>

        <Section label="Digitalização">
          <ToggleRow
            title="Salvar cópia na galeria"
            description="Guarda a foto original do documento nas suas fotos."
            value={settings.salvarCopiaNaGaleria}
            onValueChange={(salvarCopiaNaGaleria) => updateSettings({ salvarCopiaNaGaleria })}
          />
        </Section>

        <Section label="Dados">
          <Button label="Limpar dados do app" preset="danger" onPress={confirmarLimpeza} />
        </Section>
      </Stack>
    </Screen>
  );
}
