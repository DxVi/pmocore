import { createContext } from 'react';

export const THEMES = ['system', 'light', 'dark', 'emerald', 'ocean', 'rustic', 'etch'] as const;

export type Theme = (typeof THEMES)[number];
export type ResolvedTheme = Exclude<Theme, 'system'>;

export type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
