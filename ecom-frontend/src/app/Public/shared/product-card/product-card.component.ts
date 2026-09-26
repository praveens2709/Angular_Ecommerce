import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { SIZES, isStockTracked, stockFor } from '../../../Admin/Modules/products/product.service';
import { WishlistService } from '../../../Services/wishlist.service';
import { CartService } from '../../Modules/cart/cart.service';
import { BagDrawerService } from '../../../Services/bag-drawer.service';

/** Swatch colours for common colour names (anything else gets a neutral dot) */
const SWATCHES: [RegExp, string][] = [
  [/white|ivory|cream/i, '#f5f3ef'],
  [/black|jet|charcoal/i, '#1f1f1f'],
  [/grey|gray|ash|melange/i, '#9aa0a6'],
  [/navy/i, '#1f2f5a'],
  [/royal|blue|denim|sky/i, '#2f5fd0'],
  [/olive|forest|bottle|green|mint/i, '#2f5e3d'],
  [/maroon|wine|burgundy/i, '#6d1a22'],
  [/red|crimson/i, '#c62f2f'],
  [/pink|rose|blush/i, '#e0487f'],
  [/orange|rust|burnt/i, '#e0712c'],
  [/yellow|mustard/i, '#e3b43a'],
  [/beige|sand|khaki|tan/i, '#cdb892'],
  [/brown|coffee|chocolate/i, '#6f4a2e'],
  [/purple|lavender|lilac/i, '#7b55b3'],
];
const NEW_FOR_DAYS = 21;

/** Groups a list into colour families (same name + category), keyed by product id */
export function colourFamilies(products: any[]): Map<string, any[]> {
  const byFamily = new Map<string, any[]>();
  for (const p of products) {
    const key = `${String(p.name).trim().toLowerCase()}|${p.category?._id ?? p.category ?? ''}`;
    byFamily.set(key, [...(byFamily.get(key) || []), p]);
  }
  const byId = new Map<string, any[]>();
  for (const family of byFamily.values()) for (const p of family) byId.set(p._id, family);
  return byId;
}

/**
 * Product tile used in the shop, home and wishlist: second photo on hover, badges,
 * colour dots for the product's other colours, wishlist heart and quick add to bag.
 * Corners stay square (house style).
 */
@Component({
  selector: 'app-product-card',
  standalone: false,
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  @Input({ required: true }) product: any;
  /** Other colours of this product (same name + category), for the dots */
  @Input() colours: any[] = [];
  @Input() imageWidth = 300;
  /** Wishlist page: the heart becomes a remove button */
  @Input() removable = false;

  quickAddOpen = false;
  adding = false;
  quickAddError = '';
  readonly sizes = SIZES;

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private bagDrawer: BagDrawerService,
    private host: ElementRef<HTMLElement>
  ) {}

  get hoverImage(): string | null {
    return this.product.images?.find((img: string) => img && img !== this.product.image) || null;
  }

  get isSoldOut(): boolean {
    if (isStockTracked(this.product)) return SIZES.every((s) => !stockFor(this.product, s));
    return this.product.inventoryStatus === 'OUTOFSTOCK';
  }

  /** "Only 2 left" when the whole product is nearly gone */
  get fewLeft(): number | null {
    if (!isStockTracked(this.product) || this.isSoldOut) return null;
    const total = SIZES.reduce((sum, s) => sum + (stockFor(this.product, s) || 0), 0);
    return total <= 5 ? total : null;
  }

  get discount(): number {
    const { price, mrp } = this.product;
    return mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  }

  /** Created recently (the id's first 8 hex digits are its creation time in seconds) */
  get isNew(): boolean {
    const seconds = parseInt(String(this.product._id).slice(0, 8), 16);
    return !!seconds && Date.now() / 1000 - seconds < NEW_FOR_DAYS * 86400;
  }

  get isWishlisted(): boolean {
    return this.wishlistService.has(this.product._id);
  }

  swatch(colour: any): string {
    const name = String(colour?.color || '');
    return SWATCHES.find(([pattern]) => pattern.test(name))?.[1] || '#c9bfbb';
  }

  sizeAvailable(size: string): boolean {
    if (isStockTracked(this.product)) return (stockFor(this.product, size) || 0) > 0;
    return !this.isSoldOut;
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggle(this.product);
  }

  openQuickAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickAddError = '';
    this.quickAddOpen = !this.quickAddOpen;
  }

  quickAdd(event: Event, size: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.sizeAvailable(size) || this.adding) return;
    this.adding = true;
    this.cartService.addToCart(
      this.product,
      size,
      () => {
        this.adding = false;
        this.quickAddOpen = false;
        this.bagDrawer.open({ product: this.product, size });
      },
      (message) => {
        this.adding = false;
        this.quickAddError = message;
      }
    );
  }

  /** Clicking elsewhere closes the size picker */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.quickAddOpen && !this.host.nativeElement.contains(event.target as Node)) this.quickAddOpen = false;
  }
}
