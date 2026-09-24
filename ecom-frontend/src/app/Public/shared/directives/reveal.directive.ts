import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Fades/slides an element in the first time it scrolls into view.
 * Usage: <div appReveal="up" [revealDelay]="100">
 */
@Directive({
  selector: '[appReveal]',
  standalone: false,
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  @Input('appReveal') direction: 'up' | 'left' | 'right' | 'zoom' | '' = 'up';
  @Input() revealDelay = 0;

  private observer?: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    this.renderer.addClass(node, 'reveal');
    this.renderer.addClass(node, `reveal-${this.direction || 'up'}`);
    if (this.revealDelay) this.renderer.setStyle(node, 'transition-delay', `${this.revealDelay}ms`);

    if (typeof IntersectionObserver === 'undefined') {
      this.renderer.addClass(node, 'revealed');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.renderer.addClass(node, 'revealed');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
