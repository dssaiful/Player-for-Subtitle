import { ChangeDetectionStrategy, Component, effect, inject, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from './project.service';
import { ThemeService } from './theme';
import { AIService } from './ai.service';
import { SettingsService } from './settings.service';
import { HistoryService, ProjectSnapshot } from './history.service';
import { PlaylistService } from './playlist.service';
import { VideoPlayer } from './video-player';
import { Timeline } from './timeline';
import { SubtitleList } from './subtitle-list';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, 
  FileVideo, 
  FileText, 
  Upload, 
  Download, 
  Languages, 
  Wand2, 
  Settings, 
  Sun, 
  Moon,
  Monitor,
  Zap,
  RotateCcw,
  History,
  PlayCircle,
  X,
  SkipForward,
  SkipBack,
  HelpCircle,
  Server,
  Palette,
  Cpu
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    FormsModule,
    LucideAngularModule, 
    VideoPlayer, 
    Timeline, 
    SubtitleList
  ],
  templateUrl: './app.html'
})
export class App {
  project = inject(ProjectService);
  theme = inject(ThemeService);
  ai = inject(AIService);
  history = inject(HistoryService);
  playlist = inject(PlaylistService);
  settings = inject(SettingsService);

  readonly FileVideo = FileVideo;
  readonly FileText = FileText;
  readonly Upload = Upload;
  readonly Download = Download;
  readonly Languages = Languages;
  readonly Wand2 = Wand2;
  readonly Settings = Settings;
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly Monitor = Monitor;
  readonly Zap = Zap;
  readonly RotateCcw = RotateCcw;
  readonly History = History;
  readonly PlayCircle = PlayCircle;
  readonly X = X;
  readonly SkipForward = SkipForward;
  readonly SkipBack = SkipBack;
  readonly HelpCircle = HelpCircle;
  readonly Server = Server;
  readonly Palette = Palette;
  readonly Cpu = Cpu;

  showPlaylist = false;
  showHistory = false;
  showHelp = false;
  showSettings = false;
  showTranscribeModal = false;
  customFontInput = '';
  transcribeConfig = {
    sourceLang: 'auto',
    targetLang: 'none',
    accuracy: 'tiny'
  };

  leftSidebarWidth = signal(320);
  rightSidebarWidth = signal(360);
  isDraggingLeft = false;
  isDraggingRight = false;
  dragStartX = 0;
  dragStartWidth = 0;

  isFullscreen = signal(false);

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  effectiveDisplayMode = computed(() => {
     if (this.isFullscreen()) return 'overlay';
     const mode = this.settings.subtitleDisplayMode();
     if (mode !== 'auto') return mode;
     const file = this.playlist.currentFile();
     return file?.type === 'video' ? 'lane' : 'overlay';
  });

  getSubtitleScrollProgress(sub: any): number {
     const t = this.project.currentTime();
     const duration = sub.end - sub.start;
     if (duration <= 0) return 0.5;
     return Math.max(0, Math.min(1, (t - sub.start) / duration));
  }

  private fileStateCache = new Map<string, Record<string, unknown>>();
  private previousFileId: string | null = null;
  private isStartup = true;

  constructor() {
    effect(() => {
      const current = this.playlist.currentFile();
      
      if (this.isStartup) {
        this.isStartup = false;
        if (current) this.previousFileId = current.id;
        // Don't wipe state on initial load, letting ProjectService keep localStorage
        return;
      }
      
      // Save state of previous file before switching
      if (this.previousFileId) {
         this.fileStateCache.set(this.previousFileId, this.project.getSnapshotData());
      }

      if (current) {
        if (current.id !== this.previousFileId) {
          if (this.fileStateCache.has(current.id)) {
            this.project.restoreSnapshot(this.fileStateCache.get(current.id)!);
          } else {
             // It's a new file. Only clear if we actually switched FROM another file in this session.
             if (this.previousFileId) {
               this.project.clearSubtitles();
             }
             this.project.setVideoUrl(current.url);
          }

          // Basic cache cleanup when playlist grows very large
          if (this.fileStateCache.size > 20) {
             const iterator = this.fileStateCache.keys();
             const oldest = iterator.next().value;
             if (oldest) this.fileStateCache.delete(oldest);
          }

          this.previousFileId = current.id;
        } else {
           this.project.setVideoUrl(current.url);
        }
      } else {
         this.previousFileId = null;
         this.project.clearSubtitles();
         this.project.setVideoUrl('');
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message || typeof message !== 'object') return;

        switch (message.type) {
          case 'load-video':
            if (message.url) {
              this.project.setVideoUrl(message.url);
              this.playlist.addExternalMedia(
                message.name || 'External Video', 
                message.url, 
                'video'
              );
            }
            break;
          case 'import-srt':
            if (message.content) {
              this.project.importSRT(message.content);
            }
            break;
          case 'pause':
            this.project.setPlaying(false);
            break;
          case 'play':
            this.project.setPlaying(true);
            break;
          case 'get-srt':
            if (event.source) {
              (event.source as Window).postMessage({ 
                type: 'srt-content', 
                content: this.project.exportSRT() 
              }, { targetOrigin: '*' });
            }
            break;
        }
      });
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(e: KeyboardEvent) {
    const targetName = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetName === 'input' || targetName === 'textarea') return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.project.setPlaying(!this.project.playing());
    }
  }

  handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      Array.from(target.files).forEach(file => {
        this.playlist.addFile(file);
      });
    }
  }

  saveVersion() {
    const name = prompt("Version Name?", `Update ${new Date().toLocaleTimeString()}`);
    if (name) {
      this.history.saveSnapshot(name, this.project.getSnapshotData());
    }
  }

  restoreVersion(snapshot: ProjectSnapshot) {
    if (confirm(`Restore version "${snapshot.name}"? Current unsaved changes will be lost.`)) {
      this.project.restoreSnapshot(snapshot.data as Record<string, unknown>);
      this.showHistory = false;
    }
  }

  exportSRT() {
    const srt = this.project.exportSRT();
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const activeFile = this.playlist.currentFile();
    let defaultName = 'subtitles.srt';
    if (activeFile) {
       defaultName = activeFile.name.replace(/\.[^/.]+$/, "") + '.srt';
    }
    
    const fileName = prompt('Save subtitle as:', defaultName);
    if (!fileName) return;
    
    a.download = fileName.endsWith('.srt') ? fileName : fileName + '.srt';
    a.click();
  }

  handleDragOver(e: DragEvent) {
    if (this.showPlaylist) {
       e.preventDefault();
       e.dataTransfer!.dropEffect = 'copy';
    }
  }
  
  handleDrop(e: DragEvent) {
    if (this.showPlaylist) {
       e.preventDefault();
       if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
         Array.from(e.dataTransfer.files).forEach(file => {
           this.playlist.addFile(file);
         });
       }
    }
  }

  onPlaylistClick(e: MouseEvent, fileInput: HTMLInputElement) {
    // If clicked on the empty space of the playlist
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'div' && (e.target as HTMLElement).classList.contains('p-4')) {
      fileInput.click();
    }
  }

  autoGenerate() {
    const currentFile = this.playlist.currentFile();
    if (!currentFile) {
      alert("Please load a video or audio file first.");
      return;
    }
    this.showTranscribeModal = true;
  }

  async startTranscription() {
    this.showTranscribeModal = false;
    const currentFile = this.playlist.currentFile();
    if (!currentFile) return;
    
    try {
      this.project.setProcessing(true);
      const transcription = await this.ai.transcribe(
          currentFile.url, 
          this.transcribeConfig.sourceLang, 
          this.transcribeConfig.targetLang,
          this.transcribeConfig.accuracy
      );
      
      if (transcription && transcription.length > 10) {
        this.project.importSRT(transcription);
      } else {
        // Fallback simulation
        const dummySrt = `1\n00:00:01,000 --> 00:00:04,000\n[Transcribed using fallback simulation]\n\n2\n00:00:04,500 --> 00:00:08,000\nThis application allows you to edit subtitles in real-time.\n\n3\n00:00:08,500 --> 00:00:12,000\nTry dragging the blocks on the timeline below!`;
        this.project.importSRT(dummySrt);
      }
    } catch (e) {
      console.error(e);
      alert("Transcription failed. Check console.");
    } finally {
      this.project.setProcessing(false);
      setTimeout(() => {
        this.project.setTranscriptionStatus('', 0);
      }, 2000);
    }
  }

  async translate() {
    const target = prompt("Target Language? (e.g. Japanese, German, Bangla)", "Japanese");
    if (!target) return;
    
    alert(`Translating current track to ${target}...`);
    const current = this.project.activeSubtitles();
    // In a real app we'd batch this or send the full SRT. 
    // Here we'll do simple strings or simulate.
    try {
      const srtInput = this.project.exportSRT();
      const output = await this.ai.translate(srtInput, 'English', target);
      if (output) {
        this.project.importSRT(output); // Adds as new track if implemented, or overrides
      } else {
        // simulation fallback
        for (const sub of current) {
           this.project.updateSubtitle(sub.id, { text: `[${target}] ` + sub.text });
        }
      }
    } catch (e) {
      console.error(e);
      // Fallback
      for (const sub of current) {
         this.project.updateSubtitle(sub.id, { text: `[${target}] ` + sub.text });
      }
    }
  }

  // Bottom dock dragging state
  bottomDockHeight = signal(280);
  isDraggingBottom = false;
  dragStartY = 0;
  dragStartHeight = 0;

  startDragBottom(e: MouseEvent) {
    this.isDraggingBottom = true;
    this.dragStartY = e.clientY;
    this.dragStartHeight = this.bottomDockHeight();
    document.addEventListener('mousemove', this.onDragBottom);
    document.addEventListener('mouseup', this.stopDrag);
  }

  onDragBottom = (e: MouseEvent) => {
    if (!this.isDraggingBottom) return;
    const delta = this.dragStartY - e.clientY;
    this.bottomDockHeight.set(Math.max(40, Math.min(800, this.dragStartHeight + delta)));
  };

  startDragLeft(e: MouseEvent) {
    this.isDraggingLeft = true;
    this.dragStartX = e.clientX;
    this.dragStartWidth = this.leftSidebarWidth();
    document.addEventListener('mousemove', this.onDragLeft);
    document.addEventListener('mouseup', this.stopDrag);
  }

  onDragLeft = (e: MouseEvent) => {
    if (!this.isDraggingLeft) return;
    const delta = e.clientX - this.dragStartX;
    this.leftSidebarWidth.set(Math.max(200, Math.min(800, this.dragStartWidth + delta)));
  };

  startDragRight(e: MouseEvent) {
    this.isDraggingRight = true;
    this.dragStartX = e.clientX;
    this.dragStartWidth = this.rightSidebarWidth();
    document.addEventListener('mousemove', this.onDragRight);
    document.addEventListener('mouseup', this.stopDrag);
  }

  onDragRight = (e: MouseEvent) => {
    if (!this.isDraggingRight) return;
    const delta = this.dragStartX - e.clientX; // moving left increases right sidebar width
    this.rightSidebarWidth.set(Math.max(200, Math.min(800, this.dragStartWidth + delta)));
  };

  stopDrag = () => {
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.isDraggingBottom = false;
    document.removeEventListener('mousemove', this.onDragLeft);
    document.removeEventListener('mousemove', this.onDragRight);
    document.removeEventListener('mousemove', this.onDragBottom);
    document.removeEventListener('mouseup', this.stopDrag);
  };
}
