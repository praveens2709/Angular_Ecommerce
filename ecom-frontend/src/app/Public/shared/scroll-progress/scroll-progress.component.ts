import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Thin bar along the bottom of the header showing how far down you've scrolled.
 * Updates the DOM directly (outside Angular, once per animation frame) so scrolling stays smooth.
 */
@Component({
  selector: 'app-scroll-progress',
  standalone: false,
  template: `<div class="scroll-progress" aria-hidden="true"><div #bar class="scroll-progress-bar"></div></div>`,
  styles: [
    `
      /* Sits inside each header, along its bottom edge. A bar pinned to the top of the screen
         slipped under the phone browser's toolbar while it slides away on scroll-down. */
      .scroll-progress {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
        z-index: 5;
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
        // Some mobile browsers scroll <body> rather than the window; use whichever is actually scrolling
        const doc = document.documentElement;
        const body = document.body;
        const scroller = body.scrollHeight > body.clientHeight + 1 && body.scrollTop > 0 ? body : doc;
        const top = Math.max(window.scrollY || 0, scroller.scrollTop);
        const max = Math.max(scroller.scrollHeight, doc.scrollHeight) - window.innerHeight;
        const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
        if (this.bar) this.bar.nativeElement.style.transform = `scaleX(${progress})`;
      };
      const schedule = () => {
        if (!this.frame) this.frame = requestAnimationFrame(update);
      };
      // Page height changes as content loads, so watch size as well as scroll
      const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
      resizeObserver?.observe(document.documentElement);
      resizeObserver?.observe(document.body);
      window.addEventListener('scroll', schedule, { passive: true });
      // Capture phase also sees scrolls of <body> itself (which don't reach window listeners)
      document.addEventListener('scroll', schedule, { passive: true, capture: true });
      window.addEventListener('resize', schedule, { passive: true });
      schedule();
      this.cleanup = () => {
        window.removeEventListener('scroll', schedule);
        document.removeEventListener('scroll', schedule, { capture: true });
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
