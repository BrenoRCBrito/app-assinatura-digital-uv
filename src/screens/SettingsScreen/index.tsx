import React, { useMemo } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '../../components/SegmentedControl';
import type { GestureEngine, ThemeName } from '../../domain/settings';
import { useSettings } from '../../storage/SettingsProvider';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Aparência</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tema</Text>
          <Text style={styles.cardDescription}>Muda as cores do app. Documentos e PDFs continuam em papel claro.</Text>
          <SegmentedControl
            options={THEME_OPTIONS}
            selected={settings.theme}
            onSelect={(themeName) => updateSettings({ theme: themeName })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Gestos</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Motor de gestos</Text>
          <Text style={styles.cardDescription}>Define como o selo é arrastado sobre o documento.</Text>
          <SegmentedControl
            options={GESTURE_ENGINE_OPTIONS}
            selected={settings.gestureEngine}
            onSelect={(gestureEngine) => updateSettings({ gestureEngine })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Digitalização</Text>
        <View style={[styles.card, styles.row]}>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Salvar cópia na galeria</Text>
            <Text style={styles.cardDescription}>Guarda a foto original do documento nas suas fotos.</Text>
          </View>
          <Switch
            accessibilityLabel="Salvar cópia na galeria"
            value={settings.salvarCopiaNaGaleria}
            onValueChange={(salvarCopiaNaGaleria) => updateSettings({ salvarCopiaNaGaleria })}
            trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
            thumbColor={theme.switchThumb}
          />
        </View>
      </View>
    </ScrollView>
  );
}
