import { Injectable } from '@angular/core';

export interface Definition {
  word: string;
  meaning: string;
  synonyms: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {
  // Simple offline dictionary map
  private dict: Record<string, Definition> = {
    'subtitles': { word: 'subtitles', meaning: 'Captions displayed at the bottom of a cinema or television screen.', synonyms: ['captions', 'translations'] },
    'video': { word: 'video', meaning: 'The recording, reproducing, or broadcasting of moving visual images.', synonyms: ['movie', 'film', 'clip'] },
    'edit': { word: 'edit', meaning: 'Prepare (written material) for publication by correcting, condensing, or otherwise modifying it.', synonyms: ['revise', 'alter', 'adjust'] },
    'time': { word: 'time', meaning: 'The indefinite continued progress of existence and events.', synonyms: ['moment', 'period', 'duration'] }
  };

  lookup(word: string): Definition | null {
    const cleanWord = word.toLowerCase().trim().replace(/[^\w]/g, '');
    return this.dict[cleanWord] || null;
  }

  checkSpelling(text: string): string[] {
    // Very basic spellcheck: words not in dictionary (or common list) are flagged
    const commonWords = ['a', 'the', 'is', 'at', 'on', 'to', 'in', 'for', 'with', 'it', 'this', 'that', 'welcome', 'tutorial'];
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(w => !this.dict[w] && !commonWords.includes(w));
  }
}
