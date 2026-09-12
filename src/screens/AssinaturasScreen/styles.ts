import { StyleSheet } from 'react-native';

import { FIXED_COLORS, type AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    lista: {
      flexGrow: 1,
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    vazio: {
      marginTop: 48,
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
      color: theme.textSecondary,
    },
    cartao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 6,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },
    previa: {
      width: 116,
      height: 60,
      padding: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    },
    textos: {
      flex: 1,
      gap: 4,
    },
    nome: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    data: {
      fontSize: 13,
      color: theme.textMuted,
      fontVariant: ['tabular-nums'],
    },
    excluir: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rodape: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
  });
}
