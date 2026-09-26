import { Component, DestroyRef, ElementRef, HostListener, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { ProductService, Review, isStockTracked, stockFor } from '../../../Admin/Modules/products/product.service';
import { WishlistService } from '../../../Services/wishlist.service';
import { DeliveryCheck, StoreService, addDeliveryDays } from '../../../Services/store.service';
import { PrerenderRefreshService } from '../../../Services/prerender-refresh.service';
import { CartService } from '../cart/cart.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { AddressesService } from '../account/addresses/addresses.service';
import { BagDrawerService } from '../../../Services/bag-drawer.service';
import { colourFamilies } from '../../shared/product-card/product-card.component';
import { jumpTo } from '../../../Services/scroll-manager';

interface SizeChartRow {
  size: string;
  chest: string;
  waist: string;
}

const PINCODE_KEY = 'deliveryPincode';
const SWIPE_PX = 40;
/** "Fabric: … Fit: … Care: …" at the end of a description becomes a spec list */
const SPEC_LABELS = ['Fabric', 'Material', 'GSM', 'Fit', 'Care', 'Wash', 'Neck', 'Sleeve', 'Pattern', 'Occasion'];
const SPEC_RE = new RegExp(`\\b(${SPEC_LABELS.join('|')}):\\s*`, 'g');

interface Slide {
  image: string;
  variant?: any;
}

@Component({
  selector: 'app-product-details',
  standalone: false,

  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css', './product-details-extras.css']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: any = null;
  /** Products with the same name + category, shown as colour options */
  variants: any[] = [];
  isLoading = true;
  notFound = false;
  /** Main image first, then the gallery */
  gallery: string[] = [];
  activeImage = '';

  reviews: Review[] = [];
  myReview: Review | null = null;
  reviewRating = 0;
  reviewComment = '';
  isSavingReview = false;
  reviewError = '';
  reviewDeleteError = '';
  /** Why the last add-to-bag failed (e.g. stock ran out), shown under the buttons */
  bagError = '';
  showReviewForm = false;

  readonly sizeChart: SizeChartRow[] = [
    { size: 'XS', chest: '33.0', waist: '28.3' },
    { size: 'S', chest: '36.3', waist: '31.5' },
    { size: 'M', chest: '39.5', waist: '34.5' },
    { size: 'L', chest: '42.5', waist: '37.8' },
    { size: 'XL', chest: '45.5', waist: '41.0' },
    { size: 'XXL', chest: '48.8', waist: '44.0' },
  ];
  selectedSize: string | null = null;
  showSizeError = false;
  isSizeChartVisible = false;

  pincode: string | null = null;
  pincodeInput = '';
  pincodeError = '';
  delivery: DeliveryCheck | null = null;
  checkingPincode = false;
  isPincodeDialogVisible = false;
  savedAddresses: any[] = [];
  /** Product id from the URL currently being loaded */
  private requestedId: string | null = null;

  /** Photo viewer (tap the main image) */
  zoomOpen = false;
  zoomed = false;
  zoomOrigin = '50% 50%';
  /** Phones: add-to-bag bar pinned to the bottom once the main buttons scroll away */
  showStickyBar = false;
  /** Accordions below the buttons */
  openSections = new Set<string>(['details']);
  /** Other products for "You may also like" */
  related: any[] = [];
  relatedColours = new Map<string, any[]>();
  readonly skeletonThumbs = Array.from({ length: 4 });

  private touchStart: { x: number; y: number } | null = null;
  private swiped = false;
  private stopStickyWatch?: () => void;
  private relatedFor = '';
  private readonly isBrowser: boolean;

  @ViewChild('actionsRow') set actionsRow(ref: ElementRef<HTMLElement> | undefined) {
    this.stopStickyWatch?.();
    this.stopStickyWatch = undefined;
    if (!ref || !this.isBrowser) return;
    const actions = ref.nativeElement;
    let frame = 0;
    // A scroll listener rather than an IntersectionObserver: a fast fling can jump from
    // "buttons below the screen" to "above it" in one frame, which an observer never reports
    const check = () => {
      frame = 0;
      const footer = document.querySelector('app-site-footer > *');
      const pastActions = actions.getBoundingClientRect().bottom < 0;
      // Out of the way at the bottom of the page, so it never covers the footer
      const footerInView = !!footer && footer.getBoundingClientRect().top < window.innerHeight;
      const show = pastActions && !footerInView;
      if (show !== this.showStickyBar) this.zone.run(() => (this.showStickyBar = show));
    };
    const onScroll = () => (frame ||= requestAnimationFrame(check));
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    });
    this.stopStickyWatch = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
    check();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private bagDrawer: BagDrawerService,
    private authService: AuthService,
    private addressesService: AddressesService,
    private wishlistService: WishlistService,
    private storeService: StoreService,
    private title: Title,
    private meta: Meta,
    private destroyRef: DestroyRef,
    private prerenderRefresh: PrerenderRefreshService,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnDestroy(): void {
    this.stopStickyWatch?.();
    if (this.zoomOpen) document.body.style.overflow = '';
  }

  ngOnInit(): void {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PINCODE_KEY);
    } catch {
      saved = null;
    }
    if (saved) this.lookupDelivery(saved);

    // Re-run on param change so switching colour variants reloads in place
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        // Colour switches update the URL but the product is already on screen
        filter((id) => id !== this.product?._id),
        tap((id) => {
          this.selectedSize = null;
          this.notFound = false;
          if (this.isBrowser) jumpTo(0);
          // Opened from a list: show what we already have now; full details and colours follow
          this.requestedId = id;
          const known = id ? this.productService.peek(id) : undefined;
          if (known) {
            this.isLoading = false;
            this.variants = this.productService.peekVariants(known);
            this.showProduct(known);
          } else {
            this.isLoading = true;
          }
        }),
        switchMap((id) =>
          forkJoin({
            product: id ? this.productService.getProductById(id).pipe(catchError(() => of(null))) : of(null),
            variants: id ? this.productService.getVariants(id).pipe(catchError(() => of([]))) : of([]),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ product, variants }) => {
        this.isLoading = false;
        // If the list version is already showing, a failed refresh keeps it rather than "not found"
        const shownFromList = !!this.requestedId && this.product?._id === this.requestedId;
        this.notFound = !product && !shownFromList;
        this.showSizeError = false;
        if (product || !shownFromList) this.variants = variants;
        if (product) {
          if (this.product?._id === product._id) {
            // Already on screen from the list: refresh details without resetting the photo or reviews
            this.product = product;
            this.gallery = [product.image, ...(product.images || [])].filter(Boolean);
            if (!this.gallery.includes(this.activeImage)) this.activeImage = this.gallery[0] || '';
            // A size picked from the list's (older) stock may have sold out since
            if (this.selectedSize && this.isSizeSoldOut(this.selectedSize)) this.selectedSize = null;
          } else {
            this.showProduct(product);
          }
          // A pre-rendered page's stock and price are from build time: fetch the live ones
          this.prerenderRefresh.afterStartup(() => this.refreshLiveData(product._id));
        } else if (!shownFromList) this.title.setTitle('Product not found | DopeShope');
      });
  }

  /** Updates stock, price and ratings in place (the page and the shopper's choices stay as they are) */
  private refreshLiveData(id: string): void {
    forkJoin({
      product: this.productService.getProductById(id).pipe(catchError(() => of(null))),
      variants: this.productService.getVariants(id).pipe(catchError(() => of(null))),
    }).subscribe(({ product, variants }) => {
      if (!product || this.product?._id !== id) return;
      this.product = { ...this.product, ...product, images: this.product.images };
      if (variants) this.variants = variants;
      if (this.selectedSize && this.isSizeSoldOut(this.selectedSize)) this.selectedSize = null;
    });
  }

  get isOutOfStock(): boolean {
    return this.product?.inventoryStatus === 'OUTOFSTOCK';
  }

  get isInBag(): boolean {
    return !!this.product && !!this.selectedSize && this.cartService.isInCart(this.product._id, this.selectedSize);
  }

  /** Delivery date for the checked pincode (days depend on distance from the warehouse) */
  get estimatedDelivery(): Date | null {
    return this.delivery?.deliverable && this.delivery.days ? addDeliveryDays(this.delivery.days) : null;
  }


  /** Swap in place (variants are already loaded); only the URL changes, so the page doesn't reload */
  selectVariant(variant: any): void {
    if (variant._id === this.product?._id) return;
    this.showProduct(variant);
    // The chosen size may not exist in this colour
    if (this.selectedSize && this.isSizeSoldOut(this.selectedSize)) this.selectedSize = null;
    this.router.navigate(['/product-detail', variant._id], { replaceUrl: true, state: { keepScroll: true } });
  }

  private showProduct(product: any): void {
    this.product = product;
    this.gallery = [product.image, ...(product.images || [])].filter(Boolean);
    this.activeImage = this.gallery[0] || '';
    this.updateSeo(product);
    this.loadReviews(product._id);
    this.loadRelated(product);
  }

  // ---------- Gallery: swipe, dots, zoom ----------

  /** Own photos when there are several, otherwise the colour options */
  get slides(): Slide[] {
    if (this.gallery.length > 1) return this.gallery.map((image) => ({ image }));
    if (this.variants.length > 1) return this.variants.map((variant) => ({ image: variant.image, variant }));
    return [];
  }

  get activeSlide(): number {
    if (this.gallery.length > 1) return Math.max(this.gallery.indexOf(this.activeImage), 0);
    return Math.max(this.variants.findIndex((v) => v._id === this.product?._id), 0);
  }

  goToSlide(index: number): void {
    const slides = this.slides;
    if (!slides.length) return;
    const slide = slides[(index + slides.length) % slides.length];
    if (slide.variant) this.selectVariant(slide.variant);
    else this.activeImage = slide.image;
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY };
    this.swiped = false;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    this.swiped = true;
    this.zoomed = false;
    this.goToSlide(this.activeSlide + (dx < 0 ? 1 : -1));
  }

  openZoom(): void {
    // A swipe ends with a click on some devices; that shouldn't open the viewer
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.zoomOpen = true;
    this.zoomed = false;
    document.body.style.overflow = 'hidden';
  }

  closeZoom(): void {
    this.zoomOpen = false;
    this.zoomed = false;
    document.body.style.overflow = '';
  }

  /** Tap to zoom in where you tapped; tap again to zoom out */
  toggleZoom(event: MouseEvent): void {
    if (this.swiped) {
      this.swiped = false;
      return;
    }
    this.setZoomOrigin(event);
    this.zoomed = !this.zoomed;
  }

  /** Desktop: the zoomed photo follows the pointer */
  panZoom(event: MouseEvent): void {
    if (this.zoomed) this.setZoomOrigin(event);
  }

  private setZoomOrigin(event: MouseEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    this.zoomOrigin = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.zoomOpen) return;
    if (event.key === 'Escape') this.closeZoom();
    else if (event.key === 'ArrowRight') this.goToSlide(this.activeSlide + 1);
    else if (event.key === 'ArrowLeft') this.goToSlide(this.activeSlide - 1);
  }

  // ---------- Details ----------

  private parsedFor: string | null = null;
  private parsed = { text: '', specs: [] as { label: string; value: string }[] };

  /** Description split into the story and a "Fabric / Fit / Care" list */
  get details(): { text: string; specs: { label: string; value: string }[] } {
    const description = String(this.product?.description || '');
    if (description !== this.parsedFor) {
      this.parsedFor = description;
      const matches = [...description.matchAll(SPEC_RE)];
      if (!matches.length) {
        this.parsed = { text: description, specs: [] };
      } else {
        const specs = matches.map((m, i) => ({
          label: m[1],
          value: description
            .slice(m.index! + m[0].length, matches[i + 1]?.index ?? description.length)
            .trim()
            .replace(/[.,;]\s*$/, ''),
        }));
        this.parsed = { text: description.slice(0, matches[0].index).trim(), specs: specs.filter((s) => s.value) };
      }
    }
    return this.parsed;
  }

  isSectionOpen(key: string): boolean {
    return this.openSections.has(key);
  }

  toggleSection(key: string): void {
    if (this.openSections.has(key)) this.openSections.delete(key);
    else this.openSections.add(key);
  }

  /** Sticky bar: without a size, take the shopper to the sizes first */
  stickyAddToBag(): void {
    if (this.isInBag) {
      this.goToBag();
      return;
    }
    if (!this.selectedSize) {
      this.showSizeError = true;
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.addToBag();
  }

  // ---------- You may also like ----------

  private loadRelated(product: any): void {
    if (!this.isBrowser || this.relatedFor === product.name) return;
    this.relatedFor = product.name;
    this.productService
      .getProductsPage({ sort: 'newest' }, 1, 16)
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (!page || this.relatedFor !== product.name) return;
        const others = page.items.filter((p: any) => p.name !== product.name);
        // One card per product family (its other colours show as dots)
        this.relatedColours = colourFamilies(others);
        const seen = new Set<any[]>();
        this.related = others.filter((p: any) => {
          const family = this.relatedColours.get(p._id)!;
          if (seen.has(family)) return false;
          seen.add(family);
          return true;
        }).slice(0, 8);
      });
  }

  relatedTrackBy = (_: number, product: any) => product._id;

  private updateSeo(product: any): void {
    const title = `${product.name}${product.color ? ` (${product.color})` : ''} | DopeShope`;
    const description = String(product.description || '').slice(0, 160);
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'product' });
    if (/^https?:/.test(product.image)) this.meta.updateTag({ property: 'og:image', content: product.image });
  }

  // ---------- Stock ----------

  get isTracked(): boolean {
    return isStockTracked(this.product);
  }

  stockLeft(size: string): number | null {
    return stockFor(this.product, size);
  }

  isSizeSoldOut(size: string): boolean {
    return this.stockLeft(size) === 0;
  }

  /** "Only 3 left" for the chosen size */
  get lowStockMessage(): string | null {
    if (!this.selectedSize) return null;
    const left = this.stockLeft(this.selectedSize);
    return left !== null && left > 0 && left <= 5 ? `Hurry, only ${left} left in ${this.selectedSize}` : null;
  }

  // ---------- Wishlist ----------

  get isWishlisted(): boolean {
    return !!this.product && this.wishlistService.has(this.product._id);
  }

  toggleWishlist(): void {
    if (this.product) this.wishlistService.toggle(this.product);
  }

  // ---------- Reviews ----------

  get isLoggedIn(): boolean {
    return this.authService.isUserLoggedIn();
  }

  /** [5★ count, 4★ count, ...] as percentages for the bars */
  get ratingBreakdown(): { stars: number; percent: number; count: number }[] {
    const total = this.reviews.length || 1;
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = this.reviews.filter((r) => r.rating === stars).length;
      return { stars, count, percent: Math.round((count / total) * 100) };
    });
  }

  private loadReviews(productId: string): void {
    this.productService.getReviews(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        const { id } = this.authService.getUserRoleAndId();
        this.myReview = reviews.find((r) => r.userId === id) || null;
      },
      error: () => (this.reviews = []),
    });
  }

  openReviewForm(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/public/auth']);
      return;
    }
    this.reviewRating = this.myReview?.rating ?? 0;
    this.reviewComment = this.myReview?.comment ?? '';
    this.reviewError = '';
    this.showReviewForm = true;
  }

  submitReview(): void {
    if (!this.product || this.reviewRating < 1 || this.isSavingReview) return;
    this.isSavingReview = true;
    this.reviewError = '';
    this.productService.saveReview(this.product._id, this.reviewRating, this.reviewComment.trim()).subscribe({
      next: () => {
        this.isSavingReview = false;
        this.showReviewForm = false;
        this.refreshRatings();
      },
      error: (err) => {
        this.isSavingReview = false;
        this.reviewError = err.error?.message || 'Could not post your review. Please try again.';
      },
    });
  }

  deleteReview(): void {
    if (!this.product) return;
    this.reviewDeleteError = '';
    this.productService.deleteMyReview(this.product._id).subscribe({
      next: () => this.refreshRatings(),
      error: (err) => (this.reviewDeleteError = err.error?.message || 'Could not delete your review. Please try again.'),
    });
  }

  /** Reload the product too, so the average rating updates */
  private refreshRatings(): void {
    const id = this.product._id;
    this.productService.getProductById(id).subscribe((p) => {
      this.product = { ...this.product, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount };
      this.variants = this.variants.map((v) => (v._id === id ? { ...v, ...p } : v));
    });
    this.loadReviews(id);
  }

  selectSize(size: string): void {
    if (this.isSizeSoldOut(size)) return;
    this.selectedSize = size;
    this.showSizeError = false;
    this.bagError = '';
  }

  addToBag(goToBag = false): void {
    if (!this.product || this.isOutOfStock) return;
    this.bagError = '';
    if (!this.selectedSize) {
      this.showSizeError = true;
      return;
    }
    this.isSizeChartVisible = false;
    this.cartService.addToCart(
      this.product,
      this.selectedSize,
      () => {
        const added = { product: this.product, size: this.selectedSize };
        if (goToBag) this.router.navigate(['/cart']);
        else this.bagDrawer.open(added);
      },
      (message) => (this.bagError = message)
    );
  }

  scrollToReviews(): void {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
  }

  goToBag(): void {
    this.router.navigate(['/cart']);
  }

  openPincodeDialog(): void {
    this.pincodeInput = this.pincode ?? '';
    this.pincodeError = '';
    this.isPincodeDialogVisible = true;

    const { id } = this.authService.getUserRoleAndId();
    if (id && this.savedAddresses.length === 0) {
      this.addressesService.getAddresses().subscribe({
        next: (addresses) => (this.savedAddresses = addresses),
        error: () => (this.savedAddresses = []),
      });
    }
  }

  onPincodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    this.pincodeInput = input.value;
    this.pincodeError = '';
  }

  checkPincode(): void {
    if (!/^[1-9]\d{5}$/.test(this.pincodeInput)) {
      this.pincodeError = 'Please enter a valid 6-digit pincode';
      return;
    }
    this.lookupDelivery(this.pincodeInput, true);
  }

  selectAddress(address: any): void {
    this.lookupDelivery(address.postalCode, true);
  }

  /** Real check against the API (India Post directory + serviceability) */
  private lookupDelivery(pincode: string, fromDialog = false): void {
    this.checkingPincode = true;
    this.storeService.checkPincode(pincode).subscribe((result) => {
      this.checkingPincode = false;
      if (!result.valid) {
        if (fromDialog) this.pincodeError = result.message || "We couldn't find this pincode";
        else this.clearSavedPincode();
        return;
      }
      this.pincode = pincode;
      this.delivery = result;
      try {
        localStorage.setItem(PINCODE_KEY, pincode);
      } catch {
        // Storage unavailable; keep it for this page only
      }
      this.isPincodeDialogVisible = false;
    });
  }

  private clearSavedPincode(): void {
    this.pincode = null;
    this.delivery = null;
    try {
      localStorage.removeItem(PINCODE_KEY);
    } catch {
      // ignore
    }
  }

  getReadableStatus(status: string): string {
    switch (status) {
      case 'INSTOCK':
        return 'In Stock';
      case 'LOWSTOCK':
        return 'Only a few left';
      case 'OUTOFSTOCK':
        return 'Out of Stock';
      default:
        return 'Unknown Status';
    }
  }
}
