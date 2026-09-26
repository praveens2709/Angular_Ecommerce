import { Component, DestroyRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AddedToBag, BagDrawerService } from '../../../Services/bag-drawer.service';
import { CartService } from '../../Modules/cart/cart.service';

/** Mini bag that slides in from the right after "Add to bag" */
@Component({
  selector: 'app-bag-drawer',
  standalone: false,
  templateUrl: './bag-drawer.component.html',
  styleUrl: './bag-drawer.component.css',
})
export class BagDrawerComponent {
  added: AddedToBag | null = null;
  items: any[] = [];
  priceDetails: any = {};
  private readonly isBrowser: boolean;

  constructor(
    private drawer: BagDrawerService,
    cartService: CartService,
    router: Router,
    destroyRef: DestroyRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    drawer.added$.pipe(takeUntilDestroyed(destroyRef)).subscribe((added) => {
      this.added = added;
      if (this.isBrowser) this.document.body.style.overflow = added ? 'hidden' : '';
    });
    cartService.getCartItems().pipe(takeUntilDestroyed(destroyRef)).subscribe((items) => (this.items = items));
    cartService.getPriceDetails().pipe(takeUntilDestroyed(destroyRef)).subscribe((p) => (this.priceDetails = p));
    router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(destroyRef))
      .subscribe(() => this.close());
  }

  get open(): boolean {
    return !!this.added;
  }

  /** Bag total for everything in it (not just the selected lines) */
  get bagTotal(): number {
    return this.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }

  close(): void {
    if (this.added) this.drawer.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
