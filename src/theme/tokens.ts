import type { TextStyle } from 'react-native';

type SpaceStep = 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 28 | 36 | 48;
type SizeStep = 13 | 16 | 18 | 20 | 22 | 28 | 36 | 44 | 48 | 52 | 56 | 58 | 60 | 76 | 116 | 150 | 200;
type FontSizeStep = 12 | 13 | 14 | 15 | 16 | 17 | 20 | 22 | 32;
type LineHeightStep = 20 | 23;
type LetterSpacingStep = -0.5 | -0.3 | 0.6;
type RadiusStep = 4 | 6 | 7 | 8 | 10 | 14 | 16 | 22 | 29 | 38;
type LineWidthStep = 1 | 1.5 | 1.7 | 1.8 | 2 | 2.4 | 2.5 | 3 | 4;
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
  icon: 8,
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
  feature: 20,
  choiceChips: 8,
  choiceChip: 8,
  stepper: 12,
  stepperLabel: 8,
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
  buttonY: 12,
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
  feature: 22,
  menuItemX: 16,
  cameraBarX: 12,
  cameraX: 36,
  cameraFrameY: 12,
  hintX: 14,
  hintY: 8,
  shutterTop: 18,
  photoY: 8,
  choiceChipX: 16,
} satisfies Record<string, SpaceStep>;

const size = {
  control: 48,
  touchTarget: 44,
  iconSmall: 18,
  iconMedium: 22,
  previewWidth: 116,
  previewHeight: 60,
  logo: 200,
  iconMenu: 20,
  iconFeature: 28,
  featureIconBox: 52,
  menuIconBox: 36,
  menuItem: 60,
  cameraBar: 56,
  cameraGuide: 36,
  shutter: 76,
  shutterCore: 58,
  shutterArea: 150,
  photoBar: 52,
  choiceChipIcon: 16,
  stepperIcon: 20,
  stampHandle: 20,
  stampHandleIcon: 13,
} satisfies Record<string, SizeStep>;

const radius = {
  surface: 14,
  control: 8,
  danger: 6,
  segmentTrack: 10,
  segment: 7,
  feature: 16,
  featureIconBox: 14,
  menuIconBox: 10,
  hint: 16,
  cameraGuide: 10,
  cameraControl: 22,
  shutter: 38,
  shutterCore: 29,
  choiceChip: 22,
  stepper: 10,
  stamp: 4,
  stampHandle: 10,
} satisfies Record<string, RadiusStep>;

const lineWidth = {
  hairline: 1,
  outline: 1.5,
  paperGuide: 1.5,
  iconMedium: 1.8,
  iconSmall: 2,
  drawing: 2,
  ink: 3,
  iconFeature: 1.7,
  iconBoxed: 1.8,
  iconTrailing: 2,
  iconOverlay: 2,
  cameraGuide: 3,
  shutterRing: 4,
  choiceChipIcon: 2.5,
  stepperIcon: 2,
  stampFrame: 1.5,
  stampHandleIcon: 2.4,
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
  hint: { fontSize: 14, fontWeight: '500' },
  photoTitle: { fontSize: 17, fontWeight: '600' },
  choiceChip: { fontSize: 15, fontWeight: '600' },
  stepperValue: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TypographyToken>;

export const tokens = { gap, inset, size, radius, lineWidth, opacity, typography };

export type Tokens = typeof tokens;
