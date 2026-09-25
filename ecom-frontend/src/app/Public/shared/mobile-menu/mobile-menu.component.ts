import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, Inject, Input, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

/** Hamburger button (phones only) that opens a slide-in menu */
@Component({
  selector: 'app-mobile-menu',
  standalone: false,
  templateUrl: './mobile-menu.component.html',
  styleUrl: './mobile-menu.component.css',
})
export class MobileMenuComponent implements AfterViewInit, OnDestroy {
  /** White icon for dark backgrounds (home hero) */
  @Input() light = false;
  @ViewChild('drawer') drawer?: ElementRef<HTMLElement>;

  open = false;
  isLoggedIn = false;

  readonly links = [
    { path: '/home', label: 'Home', icon: 'pi-home' },
    { path: '/shop', label: 'Shop all', icon: 'pi-th-large' },
    { path: '/account/wishlist', label: 'Wishlist', icon: 'pi-heart' },
    { path: '/cart', label: 'Bag', icon: 'pi-shopping-bag' },
  ];
  readonly accountLinks = [
    { path: '/account/overview', label: 'My account', icon: 'pi-user' },
    { path: '/account/orders', label: 'Orders & returns', icon: 'pi-box' },
  ];
  readonly helpLinks = [
    { path: '/contact', label: 'Contact us' },
    { path: '/shipping-policy', label: 'Shipping' },
    { path: '/returns-policy', label: 'Returns & refunds' },
  ];

  private readonly isBrowser: boolean;

  constructor(
    authService: AuthService,
    router: Router,
    destroyRef: DestroyRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    authService.isUserLoggedIn$.pipe(takeUntilDestroyed(destroyRef)).subscribe((v) => (this.isLoggedIn = v));
    router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(destroyRef))
      .subscribe(() => this.close());
  }

  // The header keeps a transform from its entrance animation, which would trap a fixed drawer
  // inside the header strip; living under <body> lets it cover the screen.
  ngAfterViewInit(): void {
    if (this.isBrowser && this.drawer) this.document.body.appendChild(this.drawer.nativeElement);
  }

  ngOnDestroy(): void {
    this.setScrollLock(false);
    this.drawer?.nativeElement.remove();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.open = true;
    this.setScrollLock(true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.setScrollLock(false);
  }

  onPanelClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private setScrollLock(locked: boolean): void {
    if (this.isBrowser) this.document.body.style.overflow = locked ? 'hidden' : '';
  }
}
