import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  aiProvider = signal<'browser' | 'custom'>('browser');
  customEndpoint = signal<string>('http://localhost:11434/v1/chat/completions');
  customApiKey = signal<string>('');
  customModel = signal<string>('llama3');
  uiScale = signal<number>(100);

  subtitleFontSize = signal<number>(24);
  subtitleDisplayMode = signal<'auto' | 'overlay' | 'lane'>('auto');
  subtitleBackground = signal<string>('#000000');
  subtitleOpacity = signal<number>(70);
  languageFonts = signal<Record<string, string>>({
    'en': 'Inter',
    'de': 'Inter',
    'ja': 'Noto Sans JP',
    'bn': 'Noto Sans Bengali',
  });
  importedFonts = signal<string[]>([]);
  baseFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Slabo 27px', 'Raleway', 'PT Sans', 'Noto Sans JP', 'Noto Sans Bengali'];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('submaster_settings');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.aiProvider.set(data.aiProvider || 'browser');
          this.customEndpoint.set(data.customEndpoint || 'http://localhost:11434/v1/chat/completions');
          this.customApiKey.set(data.customApiKey || '');
          this.customModel.set(data.customModel || 'llama3');
          if (data.uiScale) this.uiScale.set(data.uiScale);
          if (data.subtitleFontSize) this.subtitleFontSize.set(data.subtitleFontSize);
          if (data.subtitleDisplayMode) this.subtitleDisplayMode.set(data.subtitleDisplayMode);
          if (data.subtitleBackground) this.subtitleBackground.set(data.subtitleBackground);
          if (data.subtitleOpacity !== undefined) this.subtitleOpacity.set(data.subtitleOpacity);
          if (data.languageFonts) this.languageFonts.set(data.languageFonts);
          if (data.importedFonts) {
             this.importedFonts.set(data.importedFonts);
             data.importedFonts.forEach((f: string) => this.loadGoogleFont(f));
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      this.loadGoogleFont('Noto Sans JP');
      this.loadGoogleFont('Noto Sans Bengali');

      effect(() => {
        const scale = this.uiScale();
        document.body.style.setProperty('zoom', `${scale}%`);
      });

      effect(() => {
        localStorage.setItem('submaster_settings', JSON.stringify({
          aiProvider: this.aiProvider(),
          customEndpoint: this.customEndpoint(),
          customApiKey: this.customApiKey(),
          customModel: this.customModel(),
          uiScale: this.uiScale(),
          subtitleFontSize: this.subtitleFontSize(),
          subtitleDisplayMode: this.subtitleDisplayMode(),
          subtitleBackground: this.subtitleBackground(),
          subtitleOpacity: this.subtitleOpacity(),
          languageFonts: this.languageFonts(),
          importedFonts: this.importedFonts()
        }));
      });
    }
  }

  loadGoogleFont(family: string) {
    if (typeof window === 'undefined') return;
    const id = `google-font-${family.replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  updateLanguageFont(lang: string, font: string) {
    const current = this.languageFonts();
    this.languageFonts.set({ ...current, [lang]: font });
  }

  addCustomFont(name: string) {
    if (!name.trim()) return;
    const current = this.importedFonts();
    if (!current.includes(name) && !this.baseFonts.includes(name)) {
      this.importedFonts.set([...current, name]);
      this.loadGoogleFont(name);
    }
  }
}
