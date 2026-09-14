import type { TextStyle } from 'react-native';

type SpaceStep = 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 | 28 | 36 | 48;
type SizeStep = 18 | 22 | 44 | 48 | 60 | 116 | 200;
type FontSizeStep = 12 | 13 | 14 | 15 | 16 | 20 | 22 | 32;
type LineHeightStep = 20 | 23;
type LetterSpacingStep = -0.5 | -0.3 | 0.6;
type RadiusStep = 6 | 7 | 8 | 10 | 14;
type LineWidthStep = 1 | 1.5 | 1.8 | 2 | 3;
type OpacityStep = 0.45 | 0.6;

type TypographyToken = TextStyle &
  Readonly<{
    fontSize: FontSizeStep;
    lineHeight?: LineHeightStep;
    letterSpacing?: LetterSpacingStep;
    maxWidth?: 260;
  }>;

const gap = {
  block: 20,
  list: 12,
  actions: 12,
  label: 8,
  card: 12,
  text: 4,
  row: 16,
  item: 14,
  hero: 8,
  titleText: 8,
  heroActions: 24,
  chip: 6,
  segment: 4,
  paperGuide: 12,
  paperMark: 10,
  loading: 12,
} satisfies Record<string, SpaceStep>;

const inset = {
  screen: 20,
  screenTop: 12,
  footerY: 16,
  immersive: 36,
  card: 16,
  itemY: 12,
  itemLeft: 12,
  itemRight: 6,
  buttonY: 14,
  buttonX: 28,
  dangerY: 10,
  dangerX: 20,
  chipY: 6,
  chipX: 12,
  inputX: 14,
  segmentTrack: 4,
  preview: 6,
  paperGuide: 24,
  paperGuideLine: 4,
  emptyTop: 48,
} satisfies Record<string, SpaceStep>;

const size = {
  control: 48,
  touchTarget: 44,
  iconSmall: 18,
  iconMedium: 22,
  previewWidth: 116,
  previewHeight: 60,
  logo: 200,
} satisfies Record<string, SizeStep>;

const radius = {
  surface: 14,
  control: 8,
  danger: 6,
  segmentTrack: 10,
  segment: 7,
} satisfies Record<string, RadiusStep>;

const lineWidth = {
  hairline: 1,
  outline: 1.5,
  paperGuide: 1.5,
  iconMedium: 1.8,
  iconSmall: 2,
  drawing: 2,
  ink: 3,
} satisfies Record<string, LineWidthStep>;

const opacity = {
  disabled: 0.45,
  pressed: 0.6,
} satisfies Record<string, OpacityStep>;

const typography = {
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  screenTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  status: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 260 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  supporting: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13, fontVariant: ['tabular-nums'] },
  button: { fontSize: 16, fontWeight: '600' },
  chip: { fontSize: 14, fontWeight: '600' },
  segment: { fontSize: 15, fontWeight: '600' },
  input: { fontSize: 16 },
  paperMark: { fontSize: 20, fontWeight: '600' },
} satisfies Record<string, TypographyToken>;

export const tokens = { gap, inset, size, radius, lineWidth, opacity, typography };

export type Tokens = typeof tokens;
