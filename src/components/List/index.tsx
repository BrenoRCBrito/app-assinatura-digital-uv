import React, { useMemo } from 'react';
import { FlatList } from 'react-native';

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

  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      contentContainerStyle={styles.content}
      ListEmptyComponent={loading ? <LoadingIndicator /> : <EmptyState message={emptyMessage} />}
      renderItem={({ item }) => renderItem(item)}
    />
  );
}
