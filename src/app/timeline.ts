import { ChangeDetectionStrategy, Component, inject, computed, signal, ElementRef, ViewChild } from '@angular/core';
import { ProjectService, Subtitle } from './project.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="h-full border-t border-line bg-bg-main relative overflow-hidden flex flex-col font-mono" #timelineContainer (wheel)="onWheel($event)">
      <!-- Ruler -->
      <div class="h-6 border-b border-line flex items-center px-4 bg-bg-panel/50 backdrop-blur z-30">
         <div class="flex-1 flex overflow-hidden relative h-full">
            @for (mark of timeMarks(); track $index) {
              <div class="absolute top-0 h-full border-l border-line/20 flex flex-col justify-end" [style.left.px]="mark.pos">
                <span class="text-[8px] ml-1 mb-0.5 opacity-40 uppercase tracking-tighter">{{ mark.label }}</span>
              </div>
            }
         </div>
         <div class="text-[9px] font-black text-accent px-3 py-1 bg-accent/5 rounded-full border border-accent/20">
           {{ formatTime(currentTime()) }}
         </div>
      </div>

      <!-- Tracks Area -->
      <div class="flex-1 relative overflow-x-auto overflow-y-hidden cursor-crosshair [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-bg-panel [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb:hover]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full" #scrollArea (mousedown)="onTimelineClick($event)">
        <div class="relative min-h-full" [style.width.px]="timelineWidth()">
          
          <!-- Sync Grid -->
          <div class="absolute inset-x-0 h-full pointer-events-none opacity-[0.03] z-0">
            @for (mark of timeMarks(); track $index) {
              <div class="absolute top-0 bottom-0 border-l border-ink" [style.left.px]="mark.pos"></div>
            }
          </div>

          <!-- Playhead (Minimalist Needle) -->
          <div class="absolute top-0 bottom-0 w-[2px] bg-accent z-40 transform hover:scale-x-150 transition-transform cursor-ew-resize group/playhead" 
               [style.left.px]="playheadPos()"
               (mousedown)="onPlayheadDragStart($event)">
            <div class="absolute -top-1 -left-[3px] w-2 h-2 bg-accent rounded-full shadow-[0_0_12px_var(--accent-glow)] scale-125 group-hover/playhead:scale-[2]"></div>
          </div>

          <!-- Main Subtitle Track -->
          <div class="relative h-24 mt-6 px-4 z-10">
            @for (sub of activeSubs(); track sub.id) {
              <div class="absolute top-0 bottom-0 rounded-2xl px-4 py-3 text-[10px] overflow-hidden whitespace-nowrap cursor-move transition-all duration-300 z-20 group border backdrop-blur-md shadow-2xl flex items-center"
                   [class.bg-accent]="isActive(sub)"
                   [class.text-bg-deep]="isActive(sub)"
                   [class.border-accent]="isActive(sub)"
                   [class.bg-bg-panel/80]="!isActive(sub)"
                   [class.text-ink/40]="!isActive(sub)"
                   [class.border-line]="!isActive(sub)"
                   [style.left.px]="timeToPos(sub.startTime)"
                   [style.width.px]="timeToPos(sub.endTime) - timeToPos(sub.startTime)"
                   (mousedown)="onSubDragStart($event, sub)">
                
                <span class="font-black tracking-tight uppercase">{{ sub.text || '...' }}</span>
                
                <!-- Resizers -->
                <div class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors rounded-l-2xl" (mousedown)="onResizeStart($event, sub, 'start')"></div>
                <div class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors rounded-r-2xl" (mousedown)="onResizeStart($event, sub, 'end')"></div>
              </div>
            }
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class Timeline {
  private projectService = inject(ProjectService);
  
  @ViewChild('scrollArea') scrollArea!: ElementRef;
  
  zoom = signal<number>(140); 
  currentTime = this.projectService.currentTime;
  duration = this.projectService.duration;
  activeSubs = this.projectService.activeSubtitles;

  timelineWidth = computed(() => Math.max(1200, (this.duration() + 15) * this.zoom()));
  playheadPos = computed(() => this.currentTime() * this.zoom());

  timeMarks = computed(() => {
    const marks = [];
    const interval = this.zoom() > 60 ? 5 : 10;
    for (let i = 0; i <= this.duration() + 10; i += interval) {
      marks.push({
        pos: i * this.zoom(),
        label: this.formatTime(i)
      });
    }
    return marks;
  });

  draggingSub: Subtitle | null = null;
  dragType: 'move' | 'start' | 'end' | 'playhead' = 'move';
  dragStartX = 0;
  dragStartValue = 0;

  timeToPos(time: number) { return time * this.zoom(); }
  posToTime(pos: number) { return pos / this.zoom(); }

  formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  isActive(sub: Subtitle) {
    return this.currentTime() >= sub.startTime && this.currentTime() <= sub.endTime;
  }

  onWheel(e: WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoom.update(z => Math.max(20, Math.min(800, z * delta)));
    }
  }

  onTimelineClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.absolute')) return;
    const rect = this.scrollArea.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left + this.scrollArea.nativeElement.scrollLeft;
    this.projectService.setCurrentTime(this.posToTime(x));
  }

  onPlayheadDragStart(e: MouseEvent) {
    e.stopPropagation();
    this.dragType = 'playhead';
    document.addEventListener('mousemove', this.onPlayheadMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onPlayheadMove = (e: MouseEvent) => {
    e.preventDefault();
    if (this.dragType !== 'playhead') return;
    const rect = this.scrollArea.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left + this.scrollArea.nativeElement.scrollLeft;
    this.projectService.setCurrentTime(Math.max(0, Math.min(this.duration(), this.posToTime(x))));
  };

  onSubDragStart(e: MouseEvent, sub: Subtitle) {
    e.stopPropagation();
    this.draggingSub = sub;
    this.dragType = 'move';
    this.dragStartX = e.clientX;
    this.dragStartValue = sub.startTime;
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onResizeStart(e: MouseEvent, sub: Subtitle, type: 'start' | 'end') {
    e.stopPropagation();
    this.draggingSub = sub;
    this.dragType = type;
    this.dragStartX = e.clientX;
    this.dragStartValue = type === 'start' ? sub.startTime : sub.endTime;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (e: MouseEvent) => {
    if (!this.draggingSub) return;
    const deltaX = (e.clientX - this.dragStartX) / this.zoom();
    const sub = this.draggingSub;

    if (this.dragType === 'move') {
      const duration = sub.endTime - sub.startTime;
      const newStart = Math.max(0, this.dragStartValue + deltaX);
      this.projectService.updateSubtitle(sub.id, { 
        startTime: newStart, 
        endTime: newStart + duration 
      });
    } else if (this.dragType === 'start') {
      const newStart = Math.max(0, Math.min(sub.endTime - 0.1, this.dragStartValue + deltaX));
      this.projectService.updateSubtitle(sub.id, { startTime: newStart });
    } else if (this.dragType === 'end') {
      const newEnd = Math.max(sub.startTime + 0.1, Math.min(this.duration(), this.dragStartValue + deltaX));
      this.projectService.updateSubtitle(sub.id, { endTime: newEnd });
    }
  };

  onMouseUp = () => {
    this.draggingSub = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousemove', this.onPlayheadMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };
}
