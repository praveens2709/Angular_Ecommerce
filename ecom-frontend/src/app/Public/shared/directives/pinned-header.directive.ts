import { AfterViewInit, Directive, ElementRef, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Pins a header to the top of the screen (position: fixed) and keeps its component wrapper
 * exactly as tall as the header, so the page starts below it.
 *
 * `position: sticky` isn't enough here: the header's parent is the component's inline host
 * element, and iOS Safari limits sticky elements to that tiny box, so the header scrolled away.
 * Usage: <header appPinnedHeader> (the component's :host should be display: block).
 */
@Directive({
  selector: '[appPinnedHeader]',
  standalone: false,
  host: { class: 'pinned-header' },
})
export class PinnedHeaderDirective implements AfterViewInit, OnDestroy {
  private observer?: ResizeObserver;

  constructor(private el: ElementRef<HTMLElement>, @Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') return;
    const header = this.el.nativeElement;
    const spacer = header.parentElement;
    if (!spacer) return;
    const sync = () => (spacer.style.height = `${header.offsetHeight}px`);
    // The height changes when the logo font loads or the layout switches at a breakpoint
    this.observer = new ResizeObserver(sync);
    this.observer.observe(header);
    sync();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
