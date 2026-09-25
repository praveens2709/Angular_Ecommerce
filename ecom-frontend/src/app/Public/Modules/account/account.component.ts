import { AfterViewInit, Component, DestroyRef, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { UsersService } from '../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-account',
  standalone: false,
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent implements OnInit, AfterViewInit {
  @ViewChild('accNav') accNav?: ElementRef<HTMLElement>;
  currentRoute: string = '';
  userName: string | null = null;
  userEmail: string | null = null;
  isLoggedIn = false;
  /** Account pages depend on the signed-in user, which only the browser knows */
  readonly isBrowser: boolean;

  readonly menu = [
    {
      heading: 'Shopping',
      items: [
        { path: '/account/overview', label: 'Overview', icon: 'pi-th-large' },
        { path: '/account/orders', label: 'Orders & Returns', icon: 'pi-box' },
        { path: '/account/wishlist', label: 'Wishlist', icon: 'pi-heart' },
      ],
    },
    {
      heading: 'Account',
      items: [
        { path: '/account/profile', label: 'Profile', icon: 'pi-user' },
        { path: '/account/addresses', label: 'Addresses', icon: 'pi-map-marker' },
        { path: '/account/cards', label: 'Saved Cards', icon: 'pi-credit-card' },
        { path: '/account/delete', label: 'Delete Account', icon: 'pi-trash' },
      ],
    },
  ];
  isLogoutDialogVisible = false;

  constructor(
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService,
    private destroyRef: DestroyRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.currentRoute = this.router.url;
    });
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revealActiveTab());

    const userData = this.authService.getUserRoleAndId();
    this.isLoggedIn = !!userData.id;
    if (userData.id) {
      const cached = this.usersService.profiles.peek(userData.id);
      if (cached) {
        this.userName = cached.fullName || 'User';
        this.userEmail = cached.email;
      }
      this.usersService.getUserById(userData.id).subscribe((user) => {
        if (user) {
          this.userName = user.fullName || 'User';
          this.userEmail = user.email;
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.revealActiveTab(false);
  }

  /**
   * On phones the menu is a sideways-scrolling row; keep the selected tab in view.
   * Scrolls only the row (scrollIntoView would also move the page).
   */
  private revealActiveTab(smooth = true): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const nav = this.accNav?.nativeElement;
      const active = nav?.querySelector<HTMLElement>('a.active');
      if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
      const tab = active.getBoundingClientRect();
      const row = nav.getBoundingClientRect();
      const left = nav.scrollLeft + (tab.left - row.left) - (nav.clientWidth - tab.width) / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  /** Highlights parents too, e.g. Orders for /account/order-details/... */
  isActive(path: string): boolean {
    const url = this.currentRoute.split('?')[0];
    if (path === '/account/orders') return url.startsWith('/account/orders') || url.startsWith('/account/order-details');
    if (path === '/account/profile') return url.startsWith('/account/profile');
    return url === path;
  }

  get initials(): string {
    return (this.userName || 'Guest')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  logout(): void {
    this.isLogoutDialogVisible = false;
    this.authService.logoutUser();
    this.userName = null;
    this.isLoggedIn = false;
    this.router.navigate(['/home']);
  }
}
