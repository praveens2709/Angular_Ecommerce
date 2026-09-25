import { ApplicationRef, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';

/**
 * Pre-rendered pages (Cloudflare) carry the API data from build time, and while the app starts up
 * Angular reuses it instead of calling the API. Pages whose data can change without a rebuild
 * (stock, prices) use this to fetch the live values once the app has finished starting.
 */
@Injectable({ providedIn: 'root' })
export class PrerenderRefreshService {
  private started = false;
  private readonly isBrowser: boolean;

  constructor(private appRef: ApplicationRef, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) this.appRef.isStable.pipe(first((stable) => stable)).subscribe(() => (this.started = true));
  }

  /** Runs `refresh` once the app is up, but only for data that arrived during start-up (i.e. from the page's HTML) */
  afterStartup(refresh: () => void): void {
    if (!this.isBrowser || this.started) return;
    this.appRef.isStable.pipe(first((stable) => stable)).subscribe(() => setTimeout(refresh));
  }
}
