import { Injectable, signal } from '@angular/core';

export type ThemeName = 'default' | 'dawn' | 'eco' | 'sunset' | 'cyber';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentTheme = signal<ThemeName>('default');

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('submaster_theme_name') as ThemeName;
      if (saved && ['default', 'dawn', 'eco', 'sunset', 'cyber'].includes(saved)) {
        this.setTheme(saved);
      } else {
        this.setTheme('default');
      }
    }
  }

  setTheme(theme: ThemeName) {
    this.currentTheme.set(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('submaster_theme_name', theme);
      
      const root = document.documentElement;
      // Remove all theme classes
      root.classList.remove('theme-default', 'theme-dawn', 'theme-eco', 'theme-sunset', 'theme-cyber', 'dark');
      
      if (theme !== 'default') {
        root.classList.add(`theme-${theme}`);
      }
    }
  }
}
