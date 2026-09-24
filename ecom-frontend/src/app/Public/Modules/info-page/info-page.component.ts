import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StoreInfo, StoreService } from '../../../Services/store.service';

export type InfoPage = 'about' | 'shipping' | 'returns' | 'privacy' | 'terms';

/** Policy / company pages; the page comes from route data so each has its own URL and title */
@Component({
  selector: 'app-info-page',
  standalone: false,
  templateUrl: './info-page.component.html',
  styleUrl: './info-page.component.css',
})
export class InfoPageComponent {
  readonly page$: Observable<InfoPage>;
  readonly store$: Observable<StoreInfo>;
  /** Update when the policy text changes */
  readonly lastUpdated = new Date('2026-09-24');

  readonly links: { page: InfoPage; path: string; label: string }[] = [
    { page: 'about', path: '/about', label: 'About Us' },
    { page: 'shipping', path: '/shipping-policy', label: 'Shipping Policy' },
    { page: 'returns', path: '/returns-policy', label: 'Returns, Refunds & Cancellation' },
    { page: 'privacy', path: '/privacy-policy', label: 'Privacy Policy' },
    { page: 'terms', path: '/terms', label: 'Terms & Conditions' },
  ];

  constructor(route: ActivatedRoute, storeService: StoreService) {
    this.page$ = route.data.pipe(map((d) => d['page'] as InfoPage));
    this.store$ = storeService.info$;
  }

  titleFor(page: InfoPage): string {
    return this.links.find((l) => l.page === page)?.label ?? '';
  }

  /** "Legal name, address, city, state - pincode" with whatever is configured */
  fullAddress(store: StoreInfo): string | null {
    const line = [store.address, store.city, store.state].filter(Boolean).join(', ');
    return line ? `${line}${store.pincode ? ` - ${store.pincode}` : ''}` : null;
  }
}
