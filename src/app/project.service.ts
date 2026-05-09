import { Injectable, signal, computed, effect } from '@angular/core';

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  trackId: string;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  name: string;
  isVisible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private _subtitles = signal<Subtitle[]>([]);
  private _tracks = signal<SubtitleTrack[]>([
    { id: 'track-1', language: 'English', name: 'Original', isVisible: true }
  ]);
  private _activeTrackId = signal<string>('track-1');
  private _videoUrl = signal<string | null>(null);
  private _currentTime = signal<number>(0);
  private _duration = signal<number>(0);
  private _playing = signal<boolean>(false);
  private _isProcessing = signal<boolean>(false);
  private _transcriptionStatus = signal<string>('');
  private _transcriptionProgress = signal<number>(0);

  subtitles = computed(() => this._subtitles());
  tracks = computed(() => this._tracks());
  activeTrackId = computed(() => this._activeTrackId());
  videoUrl = computed(() => this._videoUrl());
  currentTime = computed(() => this._currentTime());
  duration = computed(() => this._duration());
  playing = computed(() => this._playing());
  isProcessing = computed(() => this._isProcessing());
  transcriptionStatus = computed(() => this._transcriptionStatus());
  transcriptionProgress = computed(() => this._transcriptionProgress());

  setProcessing(val: boolean) { this._isProcessing.set(val); }
  
  setTranscriptionStatus(status: string, progress = 0) {
    this._transcriptionStatus.set(status);
    this._transcriptionProgress.set(progress);
  }

  activeSubtitles = computed(() => 
    this._subtitles().filter(s => s.trackId === this._activeTrackId())
      .sort((a, b) => a.startTime - b.startTime)
  );

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('submaster_project_v1');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this._subtitles.set(data.subtitles || []);
          this._tracks.set(data.tracks || [{ id: 'track-1', language: 'English', name: 'Original', isVisible: true }]);
          this._activeTrackId.set(data.activeTrackId || 'track-1');
          this._videoUrl.set(data.videoUrl || null);
        } catch (e) {
          console.error('Failed to load project', e);
        }
      }

      effect(() => {
        const data = {
          subtitles: this._subtitles(),
          tracks: this._tracks(),
          activeTrackId: this._activeTrackId(),
          videoUrl: this._videoUrl()
        };
        localStorage.setItem('submaster_project_v1', JSON.stringify(data));
      });
    }
  }

  setVideoUrl(url: string) { this._videoUrl.set(url); }
  setCurrentTime(time: number) { this._currentTime.set(time); }
  setDuration(duration: number) { this._duration.set(duration); }
  setPlaying(playing: boolean) { this._playing.set(playing); }

  addSubtitle(startTime: number, endTime: number, text = '') {
    const newSub: Subtitle = { id: crypto.randomUUID(), startTime, endTime, text, trackId: this._activeTrackId() };
    this._subtitles.update(subs => [...subs, newSub]);
    return newSub;
  }

  updateSubtitle(id: string, updates: Partial<Subtitle>) {
    this._subtitles.update(subs => subs.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  deleteSubtitle(id: string) {
    this._subtitles.update(subs => subs.filter(s => s.id !== id));
  }

  splitSubtitle(id: string, splitTime: number) {
    const sub = this._subtitles().find(s => s.id === id);
    if (!sub || splitTime <= sub.startTime || splitTime >= sub.endTime) return;
    const sub1: Subtitle = { ...sub, id: crypto.randomUUID(), endTime: splitTime };
    const sub2: Subtitle = { ...sub, id: crypto.randomUUID(), startTime: splitTime };
    this._subtitles.update(all => all.filter(s => s.id !== id).concat(sub1, sub2));
  }

  clearSubtitles() {
    this._subtitles.set([]);
  }

  getSnapshotData() {
    return {
      subtitles: this._subtitles(),
      tracks: this._tracks(),
      activeTrackId: this._activeTrackId(),
      videoUrl: this._videoUrl()
    };
  }

  restoreSnapshot(data: Record<string, unknown>) {
    if (Array.isArray(data['subtitles'])) this._subtitles.set(data['subtitles'] as Subtitle[]);
    if (Array.isArray(data['tracks'])) this._tracks.set(data['tracks'] as SubtitleTrack[]);
    if (typeof data['activeTrackId'] === 'string') this._activeTrackId.set(data['activeTrackId']);
    if (typeof data['videoUrl'] === 'string' || data['videoUrl'] === null) this._videoUrl.set(data['videoUrl'] as string | null);
  }

  exportSRT() {
    const subs = this.activeSubtitles();
    let srt = '';
    subs.forEach((sub, i) => {
      srt += `${i + 1}\n${this.formatSRTTime(sub.startTime)} --> ${this.formatSRTTime(sub.endTime)}\n${sub.text}\n\n`;
    });
    return srt;
  }

  private formatSRTTime(seconds: number): string {
    const date = new Date(0); date.setSeconds(seconds);
    const ms = Math.floor((seconds % 1) * 1000);
    return date.toISOString().substring(11, 19).replace('.', ',') + ',' + ms.toString().padStart(3, '0');
  }

  importSRT(content: string) {
    const blocks = content.replace(/\r/g, '').split(/\n\n+/);
    const newSubs: Subtitle[] = [];
    blocks.forEach(block => {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        // usually 1: sequence, 2: time, 3+: text. Sometimes sequence is missing or there's whitespace.
        const timeLineIdx = lines.findIndex(l => l.includes(' --> '));
        if (timeLineIdx !== -1) {
          const timeLine = lines[timeLineIdx];
          const [start, end] = timeLine.split(' --> ');
          newSubs.push({
            id: crypto.randomUUID(),
            trackId: this._activeTrackId(),
            startTime: this.parseSRTTime(start),
            endTime: this.parseSRTTime(end),
            text: lines.slice(timeLineIdx + 1).join('\n').trim()
          });
        }
      }
    });
    this._subtitles.update(subs => [...subs, ...newSubs]);
  }

  private parseSRTTime(time: string): number {
    const parts = time.split(',');
    const main = parts[0];
    const ms = parts[1] || "0";
    const [h, m, s] = main.split(':').map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  }
}
