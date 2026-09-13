import React from 'react';

import { Text } from '../Text';

type EmptyStateProps = Readonly<{
  message: string;
}>;

export function EmptyState({ message }: EmptyStateProps) {
  return <Text preset="empty">{message}</Text>;
}
