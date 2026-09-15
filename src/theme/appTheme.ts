import { ValidationError, type Brand } from '../domain/brand';

export type ColorToken = Brand<string, 'ColorToken'>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const RGBA_COLOR = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/;

function isRgbaColor(value: string): boolean {
  const match = RGBA_COLOR.exec(value);
  if (match === null) {
    return false;
  }
  return [match[1], match[2], match[3]].every((channel) => Number(channel) <= 255);
}

export function createColorToken(value: string): ColorToken {
  if (!HEX_COLOR.test(value) && !isRgbaColor(value)) {
    throw new ValidationError(`Cor inválida no tema: ${value}`);
  }
  return value as ColorToken;
}

export type AppTheme = Readonly<{
  background: ColorToken;
  surface: ColorToken;
  stage: ColorToken;
  textPrimary: ColorToken;
  textSecondary: ColorToken;
  textMuted: ColorToken;
  primary: ColorToken;
  onPrimary: ColorToken;
  primaryMuted: ColorToken;
  onPrimaryMuted: ColorToken;
  border: ColorToken;
  divider: ColorToken;
  switchTrackOn: ColorToken;
  switchTrackOff: ColorToken;
  switchThumb: ColorToken;
  danger: ColorToken;
  onDanger: ColorToken;
}>;

export const lightTheme: AppTheme = {
  background: createColorToken('#E0E1DD'),
  surface: createColorToken('#F4F4F1'),
  stage: createColorToken('#D4D6D0'),
  textPrimary: createColorToken('#0D1B2A'),
  textSecondary: createColorToken('#415A77'),
  textMuted: createColorToken('#778DA9'),
  primary: createColorToken('#0D1B2A'),
  onPrimary: createColorToken('#E0E1DD'),
  primaryMuted: createColorToken('#1B263B'),
  onPrimaryMuted: createColorToken('#778DA9'),
  border: createColorToken('rgba(65, 90, 119, 0.28)'),
  divider: createColorToken('rgba(65, 90, 119, 0.18)'),
  switchTrackOn: createColorToken('#0D1B2A'),
  switchTrackOff: createColorToken('#C9CCC6'),
  switchThumb: createColorToken('#FAFAF8'),
  danger: createColorToken('#9E3B3B'),
  onDanger: createColorToken('#F4F4F1'),
};

export const darkTheme: AppTheme = {
  background: createColorToken('#0D1B2A'),
  surface: createColorToken('#1B263B'),
  stage: createColorToken('#1B263B'),
  textPrimary: createColorToken('#E0E1DD'),
  textSecondary: createColorToken('#778DA9'),
  textMuted: createColorToken('#778DA9'),
  primary: createColorToken('#E0E1DD'),
  onPrimary: createColorToken('#0D1B2A'),
  primaryMuted: createColorToken('#C9CCC6'),
  onPrimaryMuted: createColorToken('#415A77'),
  border: createColorToken('rgba(119, 141, 169, 0.28)'),
  divider: createColorToken('rgba(119, 141, 169, 0.22)'),
  switchTrackOn: createColorToken('#778DA9'),
  switchTrackOff: createColorToken('#415A77'),
  switchThumb: createColorToken('#E0E1DD'),
  danger: createColorToken('#9E3B3B'),
  onDanger: createColorToken('#F4F4F1'),
};

export const FIXED_COLORS = {
  paper: createColorToken('#F7F7F4'),
  paperBorder: createColorToken('rgba(65, 90, 119, 0.22)'),
  paperGuide: createColorToken('#778DA9'),
  ink: createColorToken('#1B263B'),
  cameraBackground: createColorToken('#0A141F'),
  cameraControl: createColorToken('rgba(224, 225, 221, 0.14)'),
  cameraHint: createColorToken('rgba(13, 27, 42, 0.72)'),
  shutterRing: createColorToken('rgba(224, 225, 221, 0.55)'),
  stampBorder: createColorToken('#415A77'),
  stampFill: createColorToken('rgba(224, 225, 221, 0.4)'),
  stampHandle: createColorToken('#0D1B2A'),
  stampHandleIcon: createColorToken('#E0E1DD'),
  scrim: createColorToken('rgba(13, 27, 42, 0.48)'),
} as const;
