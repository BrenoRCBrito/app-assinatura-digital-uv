import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DarkThemeScope, useAppTheme } from '../../theme';
import { screenFooter, screenPresets, type ScreenPresetName } from './presets';

type ScreenProps = Readonly<{
  preset: ScreenPresetName;
  footer?: React.ReactNode;
  children: React.ReactNode;
}>;

export function Screen({ preset, footer, children }: ScreenProps) {
  const frame = (
    <ScreenFrame preset={preset} footer={footer}>
      {children}
    </ScreenFrame>
  );

  if (screenPresets[preset].tone === 'theme') {
    return frame;
  }

  return (
    <DarkThemeScope>
      <StatusBar style="light" />
      {frame}
    </DarkThemeScope>
  );
}

function ScreenFrame({ preset, footer, children }: ScreenProps) {
  const { theme } = useAppTheme();
  const { layout, edges, background, content } = screenPresets[preset];
  const presetStyles = useMemo(
    () => ({ frame: { backgroundColor: background(theme) }, content: content(theme), footer: screenFooter(theme) }),
    [background, content, theme],
  );

  let body: React.ReactNode;
  switch (layout) {
    case 'scroll':
      body = (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'android' ? 'height' : undefined}>
          <ScrollView
            contentContainerStyle={presetStyles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      );
      break;

    case 'form':
      body = (
        <KeyboardAvoidingView
          style={[styles.fill, presetStyles.content]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      );
      break;
    case 'center':
      body = <View style={[styles.fill, styles.center, presetStyles.content]}>{children}</View>;
      break;
    case 'fill':
      body = <View style={[styles.fill, presetStyles.content]}>{children}</View>;
      break;
    default: {
      const unhandledLayout: never = layout;
      throw new Error(`Layout de tela sem montagem: ${unhandledLayout}`);
    }
  }

  return (
    <SafeAreaView style={[styles.fill, presetStyles.frame]} edges={edges}>
      {body}
      {footer === undefined ? null : <View style={presetStyles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
