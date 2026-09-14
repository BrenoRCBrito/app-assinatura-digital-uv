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
} satisfies Record<string, readonly IconPath[]>;

export const iconSizes = {
  inline: (theme: Theme) => ({ size: theme.size.iconSmall, strokeWidth: theme.lineWidth.iconSmall }),
  standalone: (theme: Theme) => ({ size: theme.size.iconMedium, strokeWidth: theme.lineWidth.iconMedium }),
} satisfies Record<string, (theme: Theme) => IconSize>;

export type IconName = keyof typeof iconShapes;
export type IconSizeName = keyof typeof iconSizes;
