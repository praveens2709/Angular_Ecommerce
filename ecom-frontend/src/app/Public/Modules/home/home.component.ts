import { Component, ElementRef, Inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../cart/cart.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../../../Admin/Modules/products/product.service';
import { CategoriesService } from '../../../Admin/Modules/categories/categories.service';
import { colourFamilies } from '../../shared/product-card/product-card.component';

interface CategoryCard {
  name: string;
  count: number;
  image: string;
}

@Component({
  selector: 'app-home',
  standalone: false,

  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css', './home-sections.css']
})

export class HomeComponent implements OnInit, OnDestroy {
  private arrivalsTrack?: ElementRef<HTMLElement>;
  private trackObserver?: ResizeObserver;

  // The track sits inside an *ngIf, so observe it whenever it (re)appears
  @ViewChild('arrivalsTrack') set arrivalsTrackRef(ref: ElementRef<HTMLElement> | undefined) {
    this.trackObserver?.disconnect();
    this.arrivalsTrack = ref;
    if (!ref || !isPlatformBrowser(this.platformId) || typeof ResizeObserver === 'undefined') return;
    this.trackObserver = new ResizeObserver(() => this.zone.run(() => this.updateArrivalsOverflow()));
    this.trackObserver.observe(ref.nativeElement);
  }

  cartCount: number = 0;
  private cartCountSub: Subscription | null = null;

  isLoading = true;
  categoryCards: CategoryCard[] = [];
  newArrivals: any[] = [];
  deal: any = null;
  /** Home menu turns white after the hero starts scrolling away */
  navScrolled = false;
  private removeScrollListener?: () => void;

  /** Show slider arrows only when the cards overflow the track */
  canScrollArrivals = false;

  countdown = { hours: '00', minutes: '00', seconds: '00' };
  private countdownTimer?: ReturnType<typeof setInterval>;

  readonly features = [
    { icon: 'pi-verified', title: 'Assured Quality', text: 'Every piece is checked before it ships.' },
    { icon: 'pi-truck', title: 'Free Shipping', text: 'No minimum order. Delivered to your door.' },
    { icon: 'pi-replay', title: 'Easy Returns', text: 'Changed your mind? Return within 7 days.' },
    { icon: 'pi-lock', title: 'Secure Checkout', text: 'Pay by UPI, card or cash on delivery.' },
  ];

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });

    const emptyPage = { items: [] as any[], total: 0, page: 1, limit: 0 };
    forkJoin({
      categories: this.categoriesService.getCategorySummary().pipe(catchError(() => of([]))),
      arrivals: this.productService.getProductsPage({ sort: 'newest' }, 1, 10).pipe(catchError(() => of(emptyPage))),
      deal: this.productService.getProductsPage({ sort: 'discount', inStock: true }, 1, 1).pipe(catchError(() => of(emptyPage))),
    }).subscribe(({ categories, arrivals, deal }) => {
      this.isLoading = false;
      this.categoryCards = categories
        .map((c: any) => ({ name: c.name, count: c.count, image: c.image || 'assets/images/placeholder.png' }))
        .sort((a: CategoryCard, b: CategoryCard) => b.count - a.count);
      this.newArrivals = arrivals.items;
      this.deal = deal.items[0] ?? null;
    });

    this.startCountdown();
    this.watchScroll();
  }

  /** Listens outside Angular; only re-renders when the white/transparent state flips */
  private watchScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      const onScroll = () => {
        const scrolled = window.scrollY > 60;
        if (scrolled !== this.navScrolled) this.zone.run(() => (this.navScrolled = scrolled));
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.removeScrollListener = () => window.removeEventListener('scroll', onScroll);
    });
  }

  ngOnDestroy(): void {
    this.cartCountSub?.unsubscribe();
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.trackObserver?.disconnect();
    this.removeScrollListener?.();
  }

  /** Counts down to midnight, when the "deal of the day" resets */
  private startCountdown(): void {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, midnight.getTime() - now.getTime());
      const pad = (n: number) => String(n).padStart(2, '0');
      this.countdown = {
        hours: pad(Math.floor(diff / 3_600_000)),
        minutes: pad(Math.floor((diff % 3_600_000) / 60_000)),
        seconds: pad(Math.floor((diff % 60_000) / 1000)),
      };
    };
    tick();
    // A running interval would stop server rendering from ever finishing
    if (isPlatformBrowser(this.platformId)) {
      this.countdownTimer = setInterval(() => this.zone.run(tick), 1000);
    }
  }

  private updateArrivalsOverflow(): void {
    const track = this.arrivalsTrack?.nativeElement;
    this.canScrollArrivals = !!track && track.scrollWidth > track.clientWidth + 4;
  }

  /** Keeps cards in place when fresh data arrives, so an open quick-add survives */
  trackById = (_: number, product: any) => product._id;

  private familiesFor: any[] | null = null;
  private families = new Map<string, any[]>();

  /** Other colours among the new arrivals, for the card's colour dots */
  coloursFor(product: any): any[] {
    if (this.familiesFor !== this.newArrivals) {
      this.familiesFor = this.newArrivals;
      this.families = colourFamilies(this.newArrivals);
    }
    return this.families.get(product._id) || [];
  }

  scrollArrivals(direction: 1 | -1): void {
    const track = this.arrivalsTrack?.nativeElement;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  }

  scrollToContent(): void {
    globalThis.document?.getElementById('home-content')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollUp() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
