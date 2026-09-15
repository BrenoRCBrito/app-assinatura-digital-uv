import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';
import type { TextPresetName } from '../Text/presets';

type DadoDoDocumentoStyles = Readonly<{
  dado: ViewStyle;
  valor: TextPresetName;
}>;

export const dadoDoDocumentoPresets = {
  default: (theme: Theme) => ({
    dado: { gap: theme.gap.dataItem },
    valor: 'dataValue',
  }),
  coordenadas: (theme: Theme) => ({
    dado: { gap: theme.gap.dataItem },
    valor: 'coordinates',
  }),
} satisfies Record<string, (theme: Theme) => DadoDoDocumentoStyles>;

export type DadoDoDocumentoPresetName = keyof typeof dadoDoDocumentoPresets;
