import React from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

type KeyboardDismissAreaProps = Readonly<{
  children: React.ReactNode;
}>;

export function KeyboardDismissArea({ children }: KeyboardDismissAreaProps) {
  return (
    <Pressable style={styles.fill} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
