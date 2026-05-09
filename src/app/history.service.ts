import { Injectable, signal, computed } from '@angular/core';

export interface ProjectSnapshot {
  id: string;
  name: string;
  timestamp: number;
  data: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private _history = signal<ProjectSnapshot[]>([]);
  history = computed(() => this._history().sort((a, b) => b.timestamp - a.timestamp));

  constructor() {
    this.load();
  }

  load() {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('submaster_history');
    if (saved) {
      try {
        this._history.set(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }

  saveSnapshot(name: string, data: unknown) {
    const snapshot: ProjectSnapshot = {
      id: crypto.randomUUID(),
      name,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data))
    };
    this._history.update(h => {
      // Auto cache cleaning: only keep 20 snapshots and discard items older than 30 days
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const newHistory = [snapshot, ...h]
          .filter(s => (now - s.timestamp) < thirtyDaysMs)
          .slice(0, 20);
          
      if (typeof window !== 'undefined') {
        localStorage.setItem('submaster_history', JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }

  deleteSnapshot(id: string) {
    this._history.update(h => {
      const newHistory = h.filter(s => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('submaster_history', JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }
}
