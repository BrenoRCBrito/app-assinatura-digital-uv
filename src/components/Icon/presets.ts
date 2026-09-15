import type { Theme } from '../../theme';

type IconPath = Readonly<{
  d: string;
  strokeLinecap?: 'round';
  strokeLinejoin?: 'round';
}>;

type IconSize = Readonly<{
  size: number;
  strokeWidth: number;
}>;

export const iconShapes = {
  trash: [
    { d: 'M4 7h16', strokeLinecap: 'round' },
    { d: 'M9.5 7V4.5h5V7', strokeLinejoin: 'round' },
    { d: 'M6.5 7l1 13h9l1-13', strokeLinejoin: 'round' },
  ],
  rotate: [
    { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M21 3v5h-5', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  fingerprint: [
    { d: 'M4 8a9 9 0 0 1 16 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M6.5 10.5a5.5 5.5 0 0 1 11 0v1.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M12 10.5v5.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M9 19.5a8 8 0 0 1-2.5-5.5v-3.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M17.5 15.5a8 8 0 0 1-1.8 4.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  plus: [{ d: 'M12 5v14M5 12h14', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  logout: [
    { d: 'M14 4h5v16h-5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M10 8l-4 4 4 4', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M6 12h10', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  close: [{ d: 'M6 6l12 12M18 6L6 18', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  camera: [
    { d: 'M4 8h3l2-3h6l2 3h3v11H4z', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M15.5 13a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  documentSign: [
    { d: 'M7 3h7l4 4v13H7z', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M14 3v4h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M9.5 16.5c1-1.6 1.9-1.6 2.4 0 .5 1.6 1.4 1.6 2.6 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  signatures: [
    { d: 'M3 16c2.5-5 4.5-7 5.5-5s-1.5 6 1 6 3.5-7 6-7 1 5 3.5 5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M3 21h18', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
  settings: [
    { d: 'M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
    {
      d: 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  chevronRight: [{ d: 'M9 6l6 6-6 6', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5', strokeLinecap: 'round', strokeLinejoin: 'round' }],
  minus: [{ d: 'M5 12h14', strokeLinecap: 'round' }],
  move: [
    {
      d: 'M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  ],
  share: [
    { d: 'M12 3.5v11', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M8 7.5l4-4 4 4', strokeLinecap: 'round', strokeLinejoin: 'round' },
    { d: 'M5 11.5V20h14v-8.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
  ],
} satisfies Record<string, readonly IconPath[]>;

export const iconSizes = {
  inline: (theme: Theme) => ({ size: theme.size.iconSmall, strokeWidth: theme.lineWidth.iconSmall }),
  standalone: (theme: Theme) => ({ size: theme.size.iconMedium, strokeWidth: theme.lineWidth.iconMedium }),
  boxed: (theme: Theme) => ({ size: theme.size.iconMenu, strokeWidth: theme.lineWidth.iconBoxed }),
  trailing: (theme: Theme) => ({ size: theme.size.iconMenu, strokeWidth: theme.lineWidth.iconTrailing }),
  feature: (theme: Theme) => ({ size: theme.size.iconFeature, strokeWidth: theme.lineWidth.iconFeature }),
  overlay: (theme: Theme) => ({ size: theme.size.iconMedium, strokeWidth: theme.lineWidth.iconOverlay }),
  chip: (theme: Theme) => ({ size: theme.size.choiceChipIcon, strokeWidth: theme.lineWidth.choiceChipIcon }),
  stepper: (theme: Theme) => ({ size: theme.size.stepperIcon, strokeWidth: theme.lineWidth.stepperIcon }),
  handle: (theme: Theme) => ({ size: theme.size.stampHandleIcon, strokeWidth: theme.lineWidth.stampHandleIcon }),
} satisfies Record<string, (theme: Theme) => IconSize>;

export type IconName = keyof typeof iconShapes;
export type IconSizeName = keyof typeof iconSizes;
