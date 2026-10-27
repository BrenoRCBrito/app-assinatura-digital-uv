import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type VisualizadorDocumentoStyles = Readonly<{
  titulo: ViewStyle;
  conteudo: ViewStyle;
  margemTotal: number;
}>;

export const visualizadorDocumentoPresets = {
  default: (theme: Theme) => ({
    titulo: {
      alignItems: 'center',
      paddingTop: theme.inset.photoY * 2,
    },

    conteudo: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.inset.photoY,
    },

    // margem lateral do Screen "preview" (esquerda + direita)
    margemTotal: theme.inset.cameraX * 2,
  }),
} satisfies Record<string, (theme: Theme) => VisualizadorDocumentoStyles>;
