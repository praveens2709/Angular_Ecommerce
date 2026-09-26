import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const ENTER_CLASS = 'page-enter';
const ENTER_MS = 450;

/**
 * Soft fade-up of the new page on in-app navigation (styles.css, `page-enter`).
 * Skipped on the first load, on query-only changes (shop filters) and on colour switches
 * (`state: { keepScroll: true }`), so only real page changes animate.
 */
@Injectable({ providedIn: 'root' })
export class PageTransition {
  private lastPath = '';
  private timer?: ReturnType<typeof setTimeout>;

  constructor(router: Router, zone: NgZone, @Inject(PLATFORM_ID) platformId: object) {
    if (!isPlatformBrowser(platformId)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.lastPath = location.pathname;

    router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((event) => {
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      const pathChanged = path !== this.lastPath;
      this.lastPath = path;
      const keepScroll = !!router.getCurrentNavigation()?.extras.state?.['keepScroll'];
      if (!pathChanged || keepScroll) return;

      zone.runOutsideAngular(() => {
        const body = document.body;
        body.classList.remove(ENTER_CLASS);
        void body.offsetWidth; // restart the animation when navigating quickly
        body.classList.add(ENTER_CLASS);
        clearTimeout(this.timer);
        this.timer = setTimeout(() => body.classList.remove(ENTER_CLASS), ENTER_MS);
      });
    });
  }
}
