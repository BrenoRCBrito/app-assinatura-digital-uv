import React, { useMemo, useState } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { textFieldPresets, type TextFieldPresetName } from './presets';

type TextFieldProps = Readonly<{
  label: string;
  accessibilityLabel: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  preset?: TextFieldPresetName;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}>;

export function TextField({
  label,
  accessibilityLabel,
  value,
  onChangeText,
  placeholder,
  maxLength,
  preset = 'default',
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: TextFieldProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => textFieldPresets[preset](theme), [preset, theme]);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <View style={styles.field}>
      <Text preset="sectionLabel">{label}</Text>
      <View style={styles.container}>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={styles.placeholderColor}
          returnKeyType="done"
          style={styles.input}
          value={value}
          secureTextEntry={secureTextEntry && !mostrarSenha}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
            onPress={() => setMostrarSenha((atual) => !atual)}
            hitSlop={8}
          >
            <Icon name={mostrarSenha ? 'eyeOff' : 'eye'} size="inline" color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
