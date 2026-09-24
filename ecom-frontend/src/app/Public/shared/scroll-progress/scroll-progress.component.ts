import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Thin bar at the top of the page showing how far down you've scrolled.
 * Updates the DOM directly (outside Angular, once per animation frame) so scrolling stays smooth.
 */
@Component({
  selector: 'app-scroll-progress',
  standalone: false,
  template: `<div class="scroll-progress" aria-hidden="true"><div #bar class="scroll-progress-bar"></div></div>`,
  styles: [
    `
      .scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        z-index: 2000;
        pointer-events: none;
      }
      .scroll-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #c63543, #992603);
        box-shadow: 0 0 6px rgba(153, 38, 3, 0.45);
        transform-origin: left center;
        transform: scaleX(0);
        will-change: transform;
      }
    `,
  ],
})
export class ScrollProgressComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bar') bar?: ElementRef<HTMLElement>;
  private frame = 0;
  private cleanup?: () => void;

  constructor(private zone: NgZone, @Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      const update = () => {
        this.frame = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (this.bar) this.bar.nativeElement.style.transform = `scaleX(${progress})`;
      };
      const schedule = () => {
        if (!this.frame) this.frame = requestAnimationFrame(update);
      };
      // Page height changes as content loads, so watch size as well as scroll
      const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
      resizeObserver?.observe(document.body);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      schedule();
      this.cleanup = () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        resizeObserver?.disconnect();
        if (this.frame) cancelAnimationFrame(this.frame);
      };
    });
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
