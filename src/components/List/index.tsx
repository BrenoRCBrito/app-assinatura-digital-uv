import React, { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { EmptyState } from '../EmptyState';
import { LoadingIndicator } from '../LoadingIndicator';
import { listPresets, type ListPresetName } from './presets';

type ListProps<Item> = Readonly<{
  items: readonly Item[];
  keyOf: (item: Item) => string;
  renderItem: (item: Item) => React.ReactElement;
  loading: boolean;
  emptyMessage: string;
  preset?: ListPresetName;
}>;

export function List<Item>({ items, keyOf, renderItem, loading, emptyMessage, preset = 'default' }: ListProps<Item>) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => listPresets[preset](theme), [preset, theme]);
  const ultimo = items.length - 1;

  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      contentContainerStyle={styles.content}
      ListEmptyComponent={loading ? <LoadingIndicator /> : <EmptyState message={emptyMessage} />}
      renderItem={({ item, index }) => (
        <View style={[styles.item, index === 0 && styles.first, index === ultimo && styles.last]}>
          {styles.divider === null || index === 0 ? null : <View style={styles.divider} />}
          {renderItem(item)}
        </View>
      )}
    />
  );
}
