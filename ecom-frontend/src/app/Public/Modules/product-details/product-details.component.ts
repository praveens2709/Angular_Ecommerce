import { Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { ProductService, Review, isStockTracked, stockFor } from '../../../Admin/Modules/products/product.service';
import { WishlistService } from '../../../Services/wishlist.service';
import { DeliveryCheck, StoreService, addDeliveryDays } from '../../../Services/store.service';
import { CartService } from '../cart/cart.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { AddressesService } from '../account/addresses/addresses.service';
import { ToastService } from '../../../Services/toast-service.service';

interface SizeChartRow {
  size: string;
  chest: string;
  waist: string;
}

const PINCODE_KEY = 'deliveryPincode';

@Component({
  selector: 'app-product-details',
  standalone: false,

  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private addressesService: AddressesService,
    private toastService: ToastService,
    private wishlistService: WishlistService,
    private storeService: StoreService,
    private viewportScroller: ViewportScroller,
    private title: Title,
    private meta: Meta,
    private destroyRef: DestroyRef
  ) {}

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
        tap(() => {
          this.isLoading = true;
          this.selectedSize = null;
          this.notFound = false;
          this.viewportScroller.scrollToPosition([0, 0]);
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
        this.notFound = !product;
        this.showSizeError = false;
        this.variants = variants;
        if (product) this.showProduct(product);
        else this.title.setTitle('Product not found | DopeShope');
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
  }

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
      this.toastService.error('Please sign in', 'Sign in to write a review.');
      this.router.navigate(['/public/auth']);
      return;
    }
    this.reviewRating = this.myReview?.rating ?? 0;
    this.reviewComment = this.myReview?.comment ?? '';
    this.showReviewForm = true;
  }

  submitReview(): void {
    if (!this.product || this.reviewRating < 1 || this.isSavingReview) return;
    this.isSavingReview = true;
    this.productService.saveReview(this.product._id, this.reviewRating, this.reviewComment.trim()).subscribe({
      next: () => {
        this.isSavingReview = false;
        this.showReviewForm = false;
        this.toastService.success('Thanks!', 'Your review has been posted.');
        this.refreshRatings();
      },
      error: (err) => {
        this.isSavingReview = false;
        this.toastService.error('Could not post review', err.error?.message || 'Please try again');
      },
    });
  }

  deleteReview(): void {
    if (!this.product) return;
    this.productService.deleteMyReview(this.product._id).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'Your review was removed.');
        this.refreshRatings();
      },
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
  }

  addToBag(goToBag = false): void {
    if (!this.product || this.isOutOfStock) return;
    if (!this.selectedSize) {
      this.showSizeError = true;
      this.toastService.error('Select a size', 'Please choose a size before adding to bag.');
      return;
    }
    this.isSizeChartVisible = false;
    this.cartService.addToCart(this.product, this.selectedSize, () => {
      if (goToBag) this.router.navigate(['/cart']);
    });
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
