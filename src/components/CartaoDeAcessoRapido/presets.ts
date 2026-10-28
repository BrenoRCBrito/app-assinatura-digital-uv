import type { ImageStyle, ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type CartaoDeAcessoRapidoStyles = Readonly<{
  cartao: ViewStyle;
  foto: ImageStyle;
  semFoto: ViewStyle;
  textos: ViewStyle;
}>;

export const cartaoDeAcessoRapidoPresets = {
  default: (theme: Theme): CartaoDeAcessoRapidoStyles => {
    const caixa = {
      width: theme.size.quickAccessPhoto,
      height: theme.size.quickAccessPhoto,
      borderRadius: theme.radius.quickAccessPhoto,
    };

    return {
      cartao: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: theme.gap.item,
        padding: theme.inset.card,
        borderRadius: theme.radius.surface,
        backgroundColor: theme.surface,
      },
      foto: caixa,
      semFoto: {
        ...caixa,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.primaryMuted,
      },
      textos: {
        flex: 1,
        gap: theme.gap.text,
      },
    };
  },
} satisfies Record<string, (theme: Theme) => CartaoDeAcessoRapidoStyles>;
