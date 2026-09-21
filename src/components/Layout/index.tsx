import React from 'react';
import { StyleSheet, View, type FlexStyle } from 'react-native';

import { useAppTheme, type Theme } from '../../theme';

type Align = 'start' | 'center' | 'end' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between';

type LayoutProps = Readonly<{
  children: React.ReactNode;
  gap?: keyof Theme['gap'];
  align?: Align;
  justify?: Justify;
  flex?: number;
}>;

const ALIGN_ITEMS: Readonly<Record<Align, FlexStyle['alignItems']>> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_CONTENT: Readonly<Record<Justify, FlexStyle['justifyContent']>> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

function useLayoutStyle({ gap, align = 'stretch', justify = 'start', flex }: LayoutProps): FlexStyle {
  const { theme } = useAppTheme();

  return {
    gap: gap === undefined ? 0 : theme.gap[gap],
    alignItems: ALIGN_ITEMS[align],
    justifyContent: JUSTIFY_CONTENT[justify],
    flex,
  };
}

export function Stack(props: LayoutProps) {
  const layoutStyle = useLayoutStyle(props);

  return <View style={[styles.stack, layoutStyle]}>{props.children}</View>;
}

export function FormColumn({ children }: Readonly<{ children: React.ReactNode }>) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.column, { maxWidth: theme.size.formColumn, paddingTop: theme.inset.authTop }]}>
      {children}
    </View>
  );
}

export function Row(props: LayoutProps) {
  const layoutStyle = useLayoutStyle(props);

  return <View style={[styles.row, layoutStyle]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: 'stretch',
  },
  column: {
    alignSelf: 'center',
    width: '100%',
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
});
