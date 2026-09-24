import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

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
        else if (pathChanged && !keepScroll && !event.urlAfterRedirects.includes('#')) window.scrollTo({ top: 0, behavior: 'instant' });
      });
  }

  /** The previous page may still be loading, so retry until it's tall enough (up to ~1.5s) */
  private restore(y: number): void {
    const id = (this.restoringId = Math.random());
    const started = performance.now();
    this.zone.runOutsideAngular(() => {
      const attempt = () => {
        if (id !== this.restoringId) return;
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.min(y, Math.max(maxY, 0)), behavior: 'instant' });
        if (maxY < y && performance.now() - started < 1500) requestAnimationFrame(attempt);
      };
      requestAnimationFrame(attempt);
    });
  }
}
