import { ResolvedThemeMode, ThemeMode } from '../types/settings';

export function resolveThemeMode(theme: ThemeMode): ResolvedThemeMode {
  if (theme === 'dark' || theme === 'light') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}
