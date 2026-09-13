import type { Theme } from '../../theme';

type IconPath = Readonly<{
  d: string;
  strokeLinecap?: 'round';
  strokeLinejoin?: 'round';
}>;

type IconShape = Readonly<{
  size: number;
  strokeWidth: number;
  color: string;
  paths: readonly IconPath[];
}>;

export const iconPresets = {
  trash: (theme: Theme) => ({
    size: theme.size.iconMedium,
    strokeWidth: theme.lineWidth.iconMedium,
    color: theme.textSecondary,
    paths: [
      { d: 'M4 7h16', strokeLinecap: 'round' },
      { d: 'M9.5 7V4.5h5V7', strokeLinejoin: 'round' },
      { d: 'M6.5 7l1 13h9l1-13', strokeLinejoin: 'round' },
    ],
  }),
  rotate: (theme: Theme) => ({
    size: theme.size.iconSmall,
    strokeWidth: theme.lineWidth.iconSmall,
    color: theme.textSecondary,
    paths: [
      { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { d: 'M21 3v5h-5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    ],
  }),
} satisfies Record<string, (theme: Theme) => IconShape>;

export type IconName = keyof typeof iconPresets;
