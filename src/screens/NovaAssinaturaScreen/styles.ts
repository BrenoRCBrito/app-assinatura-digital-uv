import { StyleSheet } from 'react-native';

import { FIXED_COLORS, type AppTheme } from '../../theme/appTheme';

export function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    conteudo: {
      flex: 1,
      gap: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    campo: {
      gap: 8,
    },
    rotulo: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    input: {
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      fontSize: 16,
      color: theme.textPrimary,
    },
    areaDaAssinatura: {
      flex: 1,
      gap: 8,
    },
    cabecalhoDaAssinatura: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    botaoGirar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: theme.textSecondary,
    },
    botaoGirarPressionado: {
      opacity: 0.6,
    },
    textoGirar: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    papel: {
      flex: 1,
      overflow: 'hidden',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    },
    guia: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      gap: 12,
      pointerEvents: 'none',
    },
    linhaDaGuia: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    letraDaGuia: {
      fontSize: 20,
      fontWeight: '600',
      color: FIXED_COLORS.paperGuide,
    },
    tracoDaGuia: {
      flex: 1,
      height: 1.5,
      marginBottom: 4,
      backgroundColor: FIXED_COLORS.paperGuide,
    },
    dica: {
      fontSize: 13,
      textAlign: 'center',
      color: FIXED_COLORS.paperGuide,
    },
    acoes: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    acaoLimpar: {
      flex: 1,
    },
    acaoSalvar: {
      flex: 2,
    },
  });
}
