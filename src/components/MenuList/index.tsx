import React, { Fragment, useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { menuListPresets } from './presets';

export type MenuItem = Readonly<{
  label: string;
  icon: IconName;
  onPress: () => void;
}>;

type MenuListProps = Readonly<{
  items: readonly MenuItem[];
}>;

export function MenuList({ items }: MenuListProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => menuListPresets.default(theme), [theme]);

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index === 0 ? null : <View style={styles.divider} />}
          <Pressable
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.iconBox}>
              <Icon name={item.icon} size="boxed" color={styles.iconColor} />
            </View>
            <View style={styles.label}>
              <Text preset="itemTitle">{item.label}</Text>
            </View>
            <Icon name="chevronRight" size="trailing" color={styles.chevronColor} />
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}
