import React from 'react';

import { Card, Screen, Section, SegmentedControl, Stack, ToggleRow, type SegmentOption } from '../../components';
import type { GestureEngine, ThemeName } from '../../domain/settings';
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
      </Stack>
    </Screen>
  );
}
