import { Injectable, signal, computed } from '@angular/core';

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio';
  duration?: number;
  thumbnail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private _files = signal<MediaFile[]>([]);
  private _currentIndex = signal<number>(-1);

  files = computed(() => this._files());
  currentIndex = computed(() => this._currentIndex());
  currentFile = computed(() => {
    const idx = this._currentIndex();
    return idx >= 0 ? this._files()[idx] : null;
  });

  async addFile(file: File) {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'audio';
    const thumbnail = await this.generateThumbnail(url, type);
    
    const media: MediaFile = {
      id: crypto.randomUUID(),
      name: file.name,
      url,
      type,
      thumbnail
    };
    this.appendMedia(media);
  }

  async addExternalMedia(name: string, url: string, type: 'video' | 'audio' = 'video') {
    const thumbnail = await this.generateThumbnail(url, type);
    const media: MediaFile = {
      id: crypto.randomUUID(),
      name,
      url,
      type,
      thumbnail
    };
    this.appendMedia(media);
  }

  private generateThumbnail(url: string, type: string): Promise<string | undefined> {
    if (type !== 'video') return Promise.resolve(undefined);
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      
      const onData = () => {
        video.currentTime = Math.min(1, video.duration / 2 || 1);
      };
      
      const onSeeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          resolve(undefined);
        }
      };
      
      video.addEventListener('loadeddata', onData);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', () => resolve(undefined));
      
      video.load();
    });
  }

  private appendMedia(media: MediaFile) {
    this._files.update(fs => [...fs, media]);
    if (this._currentIndex() === -1) {
      this._currentIndex.set(this._files().length - 1);
    }
  }

  removeFile(id: string) {
    this._files.update(fs => {
      const target = fs.find(f => f.id === id);
      if (target && target.url.startsWith('blob:')) {
         URL.revokeObjectURL(target.url);
      }
      return fs.filter(f => f.id !== id);
    });
    if (this._files().length === 0) {
      this._currentIndex.set(-1);
    } else if (this._currentIndex() >= this._files().length) {
      this._currentIndex.set(this._files().length - 1);
    }
  }

  selectFile(index: number) {
    if (index >= 0 && index < this._files().length) {
      this._currentIndex.set(index);
    }
  }

  next() {
    if (this._files().length > 0) {
      this._currentIndex.update(i => (i + 1) % this._files().length);
    }
  }

  previous() {
    if (this._files().length > 0) {
      this._currentIndex.update(i => (i - 1 + this._files().length) % this._files().length);
    }
  }
}
