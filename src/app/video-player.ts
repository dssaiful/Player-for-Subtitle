import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, input, effect, OnDestroy, inject, computed, AfterViewInit, signal } from '@angular/core';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import { ProjectService } from './project.service';
import { SettingsService } from './settings.service';
import { LucideAngularModule, Repeat, X } from 'lucide-angular';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full h-full bg-bg-deep flex items-center justify-center overflow-hidden rounded-3xl border border-line shadow-2xl">
      <video #videoPlayer class="video-js vjs-big-play-centered h-full w-full"></video>
      
      @if (isAudioMedia()) {
        <canvas #visualizer class="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen opacity-80"></canvas>
      }

      <!-- Video Controls Overlay -->
      <div class="absolute top-4 right-4 flex items-center gap-1 z-20 bg-bg-panel/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-line shadow-xl pointer-events-auto transition-opacity opacity-0 group-hover:opacity-100">
        <button (click)="toggleLoop()" [class.text-accent]="isLooping()" class="p-1 hover:text-accent transition-colors opacity-70 hover:opacity-100" title="Loop Track">
          <lucide-icon [name]="Repeat" size="16"></lucide-icon>
        </button>
        <div class="w-px h-4 bg-line mx-2"></div>
        <div class="flex items-center gap-1">
          <button (click)="setA()" class="text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all" [class.bg-accent]="loopA() !== null" [class.text-bg-deep]="loopA() !== null" [class.hover:bg-bg-main]="loopA() === null" title="Set Start (A)">A</button>
          <button (click)="setB()" class="text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all" [class.bg-accent]="loopB() !== null" [class.text-bg-deep]="loopB() !== null" [class.hover:bg-bg-main]="loopB() === null" title="Set End (B)">B</button>
          @if (loopA() !== null || loopB() !== null) {
             <button (click)="clearAB()" class="p-1 hover:text-red-500 transition-colors ml-1 text-ink/40"><lucide-icon [name]="X" size="14"></lucide-icon></button>
          }
        </div>
      </div>

      <!-- Overlay Subtitles -->
      @if (activeSub() && displayMode() === 'overlay') {
        <div class="absolute bottom-16 left-0 right-0 py-2 px-4 flex justify-center pointer-events-none z-10 transition-all duration-300">
           <div class="backdrop-blur-xl text-white px-8 py-3 rounded-2xl text-center max-w-[85%] border border-white/10 shadow-2xl"
                [style.background-color]="getSubtitleRgba()"
                [style.font-family]="getFontFamily(activeSub()?.text || '')"
                [style.font-size.px]="settings.subtitleFontSize()">
             {{ activeSub()?.text }}
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    :host ::ng-deep .video-js { width: 100%; height: 100%; }
    :host ::ng-deep .vjs-tech { object-fit: contain; }
  `]
})
export class VideoPlayer implements OnDestroy, AfterViewInit {
  @ViewChild('videoPlayer', { static: true }) videoElement!: ElementRef;
  @ViewChild('visualizer', { static: false }) canvasElement?: ElementRef<HTMLCanvasElement>;
  
  url = input<string | null>(null);
  displayMode = input<'overlay' | 'lane'>('overlay');
  player?: Player;
  
  private projectService = inject(ProjectService);
  settings = inject(SettingsService);
  
  Repeat = Repeat;
  X = X;

  isLooping = signal(false);
  loopA = signal<number | null>(null);
  loopB = signal<number | null>(null);

  isAudioMedia = computed(() => {
    const u = this.url();
    if (!u) return false;
    return /\.(mp3|wav|ogg|m4a|aac)$/i.test(u);
  });

  private audioCtx?: AudioContext;
  private analyser?: AnalyserNode;
  private animationFrameId?: number;

  getFontFamily(text: string): string {
    const fonts = this.settings.languageFonts();
    let family = fonts['en'] || 'Inter';
    
    if (/[\u0980-\u09FF]/.test(text)) {
      family = fonts['bn'] || 'Noto Sans Bengali';
    } else if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      family = fonts['ja'] || 'Noto Sans JP';
    } else if (/[ÄÖÜäöüß]/.test(text)) {
      family = fonts['de'] || fonts['en'] || 'Inter';
    }
    
    return '"' + family + '", sans-serif';
  }

  getSubtitleRgba(): string {
    const hex = this.settings.subtitleBackground().replace('#', '');
    const opacity = this.settings.subtitleOpacity() / 100;
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return `rgba(0, 0, 0, ${opacity})`;
  }

  activeSub = computed(() => {
    const time = this.projectService.currentTime();
    return this.projectService.activeSubtitles().find(s => time >= s.startTime && time <= s.endTime);
  });

  constructor() {
    effect(() => {
      const videoUrl = this.url();
      if (videoUrl && this.player) {
         let type = 'video/mp4';
         if (videoUrl.endsWith('.mp3')) type = 'audio/mp3';
         else if (videoUrl.endsWith('.wav')) type = 'audio/wav';
         else if (videoUrl.endsWith('.webm')) type = 'video/webm';
         this.player.src({ src: videoUrl, type });
      }
    });

    effect(() => {
      const time = this.projectService.currentTime();
      if (this.player && typeof this.player.currentTime === 'function') {
        const pTime = this.player.currentTime() || 0;
        if (Math.abs(pTime - time) > 0.5) {
          this.player.currentTime(time);
        }
      }
    });

    effect(() => {
      const isPlaying = this.projectService.playing();
      const p = this.player;
      if (p && typeof p.paused === 'function') {
        const isPaused = p.paused();
        if (isPlaying && isPaused) {
          const promise = p.play();
          if (promise !== undefined) {
             promise.catch(e => console.error(e));
          }
        } else if (!isPlaying && !isPaused) {
          p.pause();
        }
      }
    });
  }

  toggleLoop() {
    this.isLooping.update(l => !l);
    if (this.player) {
      this.player.loop(this.isLooping());
    }
  }

  setA() {
    const t = this.player?.currentTime() || 0;
    this.loopA.set(t);
    if (this.loopB() !== null && t >= this.loopB()!) {
      this.loopB.set(null);
    }
  }

  setB() {
    const t = this.player?.currentTime() || 0;
    if (this.loopA() === null || t <= this.loopA()!) {
      this.loopA.set(Math.max(0, t - 2)); 
    }
    this.loopB.set(t);
  }

  clearAB() {
    this.loopA.set(null);
    this.loopB.set(null);
  }

  private setupWebAudio() {
    if (this.audioCtx) return;
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const videoEl = this.videoElement.nativeElement as HTMLMediaElement;
      
      // Attempt to preserve pitch (important when speed changes)
      // @ts-ignore
      videoEl.preservesPitch = true;

      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaElementSource(videoEl);

      // Noise reduction (highpass to remove rumble)
      const highpass = this.audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;

      // Compressor to auto-normalize voice
      const compressor = this.audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -35; // Kick in earlier for soft voices
      compressor.knee.value = 40;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.05;
      compressor.release.value = 0.25;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect graph: source -> highpass -> compressor -> analyser -> destination
      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn("Could not setup Web Audio API", e);
    }
  }

  private drawVisualizer = () => {
    if (!this.analyser || !this.canvasElement) {
      this.animationFrameId = requestAnimationFrame(this.drawVisualizer);
      return;
    }

    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * devicePixelRatio || canvas.height !== rect.height * devicePixelRatio) {
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
    }

    const width = canvas.width;
    const height = canvas.height;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, width, height);

    if (!this.projectService.playing()) {
       this.animationFrameId = requestAnimationFrame(this.drawVisualizer);
       return;
    }

    const barWidth = (width / bufferLength) * 1.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 255 * height * 0.8; 
      
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#02b5a5'); // Accent color
      gradient.addColorStop(1, '#6ee7b7');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1 * devicePixelRatio, barHeight + 50);

      x += barWidth;
    }

    this.animationFrameId = requestAnimationFrame(this.drawVisualizer);
  };

  ngAfterViewInit() {
    this.player = videojs(this.videoElement.nativeElement, {
      fill: true,
      fluid: false,
      controls: true,
      autoplay: false,
      preload: 'auto',
      playbackRates: [0.25, 0.5, 1, 1.5, 2, 4]
    });

    this.player.on('timeupdate', () => {
      if (this.player) {
        const t = this.player.currentTime() || 0;
        this.projectService.setCurrentTime(t);

        const a = this.loopA();
        const b = this.loopB();
        if (a !== null && b !== null && t >= b) {
           this.player.currentTime(a);
        }
      }
    });
    
    this.player.on('play', () => {
      this.projectService.setPlaying(true);
      if (!this.audioCtx) {
         this.setupWebAudio();
      }
      if (this.audioCtx?.state === 'suspended') {
         this.audioCtx.resume();
      }
    });

    this.player.on('pause', () => {
      this.projectService.setPlaying(false);
    });

    this.player.on('loadedmetadata', () => {
      if (this.player) {
        this.projectService.setDuration(this.player.duration() || 0);
      }
    });

    if (this.url()) {
      let type = 'video/mp4';
      if (this.url()!.endsWith('.mp3')) type = 'audio/mp3';
      else if (this.url()!.endsWith('.wav')) type = 'audio/wav';
      else if (this.url()!.endsWith('.webm')) type = 'video/webm';
      this.player.src({ src: this.url()!, type });
      this.player.loop(this.isLooping());
    }

    this.drawVisualizer();
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    if (this.player) {
      this.player.dispose();
    }
  }
}
