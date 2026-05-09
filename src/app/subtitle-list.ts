import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { ProjectService, Subtitle } from './project.service';
import { DictionaryService } from './dictionary.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, 
  Trash2, 
  Plus, 
  Split, 
  ChevronRight,
  BookOpen,
  Search,
  AlertCircle
} from 'lucide-angular';

@Component({
  selector: 'app-subtitle-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="h-full flex flex-col bg-bg-panel font-sans border-l border-line relative overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b border-line flex justify-between items-center bg-bg-panel/80 backdrop-blur sticky top-0 z-30">
        <div>
          <h2 class="text-[10px] uppercase tracking-[0.3em] font-black opacity-30">Editor (EN)</h2>
          <div class="h-0.5 w-4 bg-accent mt-1.5 rounded-full"></div>
        </div>
        <button (click)="addAtCurrentTime()" class="group relative p-2 bg-accent text-bg-deep rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-xl shadow-accent/20">
          <lucide-icon [name]="Plus" size="14"></lucide-icon> New Line
          <div class="absolute -top-1 -right-1 w-2 h-2 bg-accent animate-ping rounded-full opacity-50"></div>
        </button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        @for (sub of filteredSubs(); track sub.id) {
          <div class="group relative p-5 rounded-3xl border-2 transition-all duration-500 cursor-pointer"
               [class.border-accent]="isActive(sub)"
               [class.bg-accent/5]="isActive(sub)"
               [class.shadow-[0_0_30px_rgba(var(--accent-rgb),0.05)]]="isActive(sub)"
               [class.border-line]="!isActive(sub)"
               [class.bg-bg-main/30]="!isActive(sub)"
               (click)="seekTo(sub.startTime)"
               (keydown.enter)="seekTo(sub.startTime)"
               tabindex="0">
            
            <!-- Metadata & Controls -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex gap-3 text-[10px] font-mono font-black tracking-tighter transition-colors" 
                   [class.text-accent]="isActive(sub)" 
                   [class.opacity-30]="!isActive(sub)">
                <span class="bg-bg-panel px-2 py-0.5 rounded-md border border-line">{{ formatTime(sub.startTime) }}</span>
                <span class="opacity-20 self-center">→</span>
                <span class="bg-bg-panel px-2 py-0.5 rounded-md border border-line">{{ formatTime(sub.endTime) }}</span>
              </div>
              
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <button (click)="splitSub(sub, $event)" class="p-2 hover:bg-white/5 rounded-xl transition-colors" title="Split Line">
                  <lucide-icon [name]="Split" size="14"></lucide-icon>
                </button>
                <button (click)="deleteSub(sub, $event)" class="p-2 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors" title="Remove Line">
                  <lucide-icon [name]="Trash2" size="14"></lucide-icon>
                </button>
              </div>
            </div>

            <!-- Editor Core -->
            <div class="relative">
              <textarea [(ngModel)]="sub.text" 
                        (ngModelChange)="updateText(sub, $event)"
                        (keydown.enter)="$event.preventDefault()"
                        (contextmenu)="onContextMenu($event)"
                        class="w-full bg-transparent border-none resize-none p-0 text-sm font-semibold leading-relaxed transition-all placeholder:opacity-10 focus:ring-0"
                        [class.text-accent]="isActive(sub)"
                        placeholder="Type your translation..."></textarea>
              
              <!-- Real-time Validation -->
              @if (getErrors(sub.text).length) {
                <div class="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-red-500/60 uppercase tracking-widest italic animate-in fade-in slide-in-from-left-2">
                  <lucide-icon [name]="AlertCircle" size="10"></lucide-icon>
                  {{ getErrors(sub.text).join(', ') }}: dictionary mismatch
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center py-24 opacity-10">
            <div class="w-16 h-16 border-2 border-dashed border-ink rounded-full flex items-center justify-center mb-6">
              <lucide-icon [name]="ChevronRight" size="24"></lucide-icon>
            </div>
            <p class="text-[10px] uppercase tracking-[0.4em] font-black">Waiting for input</p>
          </div>
        }
      </div>

      <!-- Dictionary Modal (Floating) -->
      @if (selectedWord()) {
        <div class="absolute bottom-6 left-6 right-6 bg-bg-panel/95 backdrop-blur-2xl border-2 border-accent/20 rounded-3xl p-6 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-6 duration-500">
           <div class="flex justify-between items-start mb-4">
             <div class="flex items-center gap-3">
               <div class="p-2 bg-accent/10 rounded-xl">
                 <lucide-icon [name]="BookOpen" size="16" class="text-accent"></lucide-icon>
               </div>
               <div>
                 <h3 class="font-black text-[12px] uppercase tracking-widest text-ink">{{ selectedWord() }}</h3>
                 <p class="text-[8px] uppercase opacity-30 mt-0.5 tracking-tighter">Local Dictionary Reference</p>
               </div>
             </div>
             <button (click)="selectedWord.set(null)" class="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity p-2">Dismiss</button>
           </div>
           
           @if (definition()) {
             <p class="text-xs text-ink/70 leading-relaxed font-medium mb-4">{{ definition()?.meaning }}</p>
             <div class="flex flex-wrap gap-2">
               @for (syn of definition()?.synonyms; track syn) {
                 <span class="text-[9px] font-bold uppercase tracking-wider bg-bg-main border border-line px-3 py-1 rounded-full opacity-60 hover:opacity-100 hover:border-accent transition-all cursor-default">{{ syn }}</span>
               }
             </div>
           } @else {
             <p class="text-[10px] text-ink/30 italic font-mono">Word not found in offline records. Proceed with manual verification.</p>
           }
        </div>
      }

      <!-- Search & Replace -->
      <div class="p-6 bg-bg-main/80 backdrop-blur-xl border-t border-line absolute bottom-0 inset-x-0">
         <div class="relative group">
            <input type="text" [(ngModel)]="searchQuery" placeholder="Search Filter..." class="w-full bg-bg-panel border-2 border-line p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-accent focus:ring-0 transition-all outline-none placeholder:opacity-20 text-ink">
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
               <lucide-icon [name]="Search" size="14"></lucide-icon>
            </div>
         </div>
      </div>
    </div>
  `
})
export class SubtitleList {
  private projectService = inject(ProjectService);
  private dict = inject(DictionaryService);
  
  activeSubs = this.projectService.activeSubtitles;
  currentTime = this.projectService.currentTime;
  
  selectedWord = signal<string | null>(null);
  definition = computed(() => this.selectedWord() ? this.dict.lookup(this.selectedWord()!) : null);
  
  searchQuery = signal<string>('');
  filteredSubs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.activeSubs();
    if (!q) return list;
    return list.filter(item => item.text.toLowerCase().includes(q));
  });

  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Split = Split;
  readonly ChevronRight = ChevronRight;
  readonly BookOpen = BookOpen;
  readonly Search = Search;
  readonly AlertCircle = AlertCircle;

  isActive(sub: Subtitle) {
    return this.currentTime() >= sub.startTime && this.currentTime() <= sub.endTime;
  }

  formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  addAtCurrentTime() {
    this.projectService.addSubtitle(this.currentTime(), this.currentTime() + 2);
  }

  updateText(sub: Subtitle, text: string) {
    this.projectService.updateSubtitle(sub.id, { text });
  }

  deleteSub(sub: Subtitle, e: Event) {
    e.stopPropagation();
    this.projectService.deleteSubtitle(sub.id);
  }

  splitSub(sub: Subtitle, e: Event) {
    e.stopPropagation();
    this.projectService.splitSubtitle(sub.id, (sub.startTime + sub.endTime) / 2);
  }

  seekTo(time: number) {
    this.projectService.setCurrentTime(time);
  }

  getErrors(text: string) {
    return this.dict.checkSpelling(text);
  }

  onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLTextAreaElement;
    if (target && target.value) {
      const selection = target.value.substring(target.selectionStart, target.selectionEnd).trim();
      if (selection && selection.length > 1) {
        this.selectedWord.set(selection);
      }
    }
  }
}
