import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Jumps the page to `y` immediately, in every browser. Bootstrap turns on smooth scrolling for the
 * whole page, and older Safari doesn't know `behavior: 'instant'`, so on iPhones the jump could
 * animate (and stop partway when the new page swapped in) or not happen at all. The plain
 * scrollTo(x, y) form with smooth scrolling switched off for the moment works everywhere.
 */
export function jumpTo(y: number): void {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  // Make the browser apply the override now; otherwise it still sees "smooth" and glides
  void getComputedStyle(root).scrollBehavior;
  window.scrollTo(0, y);
  // Browsers that scroll <body> instead of the window
  if (document.body.scrollTop !== y) document.body.scrollTop = y;
  root.style.scrollBehavior = previous;
}

/**
 * New pages open at the top; Back/Forward returns to where you were.
 * Query-only changes (shop filters, search) and navigations with `state: { keepScroll: true }`
 * (product colour switches) leave the scroll position alone.
 */
@Injectable({ providedIn: 'root' })
export class ScrollManager {
  private positions = new Map<number, number>();
  private restoringId?: number;
  private lastPath = '';
  // Id of the navigation that produced the page on screen (the router stores it as history.state.navigationId)
  private currentId?: number;
  private topId?: number;

  constructor(private router: Router, private zone: NgZone, @Inject(PLATFORM_ID) platformId: object) {
    if (!isPlatformBrowser(platformId)) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    this.lastPath = location.pathname;

    let restoreTarget: number | null = null;
    router.events
      .pipe(filter((e): e is NavigationStart | NavigationEnd => e instanceof NavigationStart || e instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          // Remember where the page we're leaving was scrolled to. history.state can't be used here:
          // on Back/Forward it already belongs to the page we're going to.
          if (this.currentId !== undefined) this.positions.set(this.currentId, window.scrollY);
          restoreTarget =
            event.navigationTrigger === 'popstate' && event.restoredState
              ? this.positions.get(event.restoredState.navigationId) ?? 0
              : null;
          return;
        }

        this.currentId = event.id;
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        const pathChanged = path !== this.lastPath;
        this.lastPath = path;
        const keepScroll = !!this.router.getCurrentNavigation()?.extras.state?.['keepScroll'];

        if (restoreTarget !== null) this.restore(restoreTarget);
        else if (pathChanged && !keepScroll && !event.urlAfterRedirects.includes('#')) this.toTop();
      });
  }

  /**
   * New page: top, and stay there for the next few frames. On iPhones a tap during a swipe's
   * momentum lets the glide carry on into the new page, and late content can shift things;
   * repeating the jump briefly beats both. A touch or wheel by the shopper stops it at once.
   */
  private toTop(): void {
    const id = (this.topId = Math.random());
    this.restoringId = undefined;
    jumpTo(0);
    this.zone.runOutsideAngular(() => {
      const started = performance.now();
      const stop = () => (this.topId = undefined);
      window.addEventListener('touchstart', stop, { once: true, passive: true });
      window.addEventListener('wheel', stop, { once: true, passive: true });
      const again = () => {
        if (id !== this.topId) return;
        if (window.scrollY !== 0) jumpTo(0);
        if (performance.now() - started < 350) requestAnimationFrame(again);
        else {
          window.removeEventListener('touchstart', stop);
          window.removeEventListener('wheel', stop);
        }
      };
      requestAnimationFrame(again);
    });
  }

  /** The previous page may still be loading, so retry until it's tall enough (up to ~1.5s) */
  private restore(y: number): void {
    this.topId = undefined;
    const id = (this.restoringId = Math.random());
    const started = performance.now();
    this.zone.runOutsideAngular(() => {
      const attempt = () => {
        if (id !== this.restoringId) return;
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        jumpTo(Math.min(y, Math.max(maxY, 0)));
        if (maxY < y && performance.now() - started < 1500) requestAnimationFrame(attempt);
      };
      requestAnimationFrame(attempt);
    });
  }
}
