import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { Coupon, evaluateCoupon } from '../../../Services/coupon.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<any[]>([]);
  private cartCountSubject = new BehaviorSubject<number>(0);
  private priceDetailsSubject = new BehaviorSubject<any>({
    totalMRP: 0,
    discount: 0,
    platformFee: 'Free',
    shippingFee: 'Free',
    totalAmount: 0,
    itemsCount: 0,
  });
  private couponSubject = new BehaviorSubject<Coupon | null>(null);
  /** True once the bag has been fetched at least once (so pages can tell "empty" from "loading") */
  private loadedSubject = new BehaviorSubject<boolean>(false);
  readonly loaded$ = this.loadedSubject.asObservable();
  /** Last failed quantity change, shown under that item in the bag */
  private itemErrorSubject = new BehaviorSubject<{ id: string; message: string } | null>(null);
  readonly itemError$ = this.itemErrorSubject.asObservable();

  private apiUrl = `${environment.apiUrl}/cart`;

  /** Delivery address picked on the address step, used when the order is placed */
  checkoutAddress: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    // Reload on login, clear on logout
    this.authService.isUserLoggedIn$.pipe(distinctUntilChanged()).subscribe((loggedIn) => {
      if (loggedIn) {
        this.loadCartItems();
      } else {
        this.couponSubject.next(null);
        this.setCartItems([]);
      }
    });
  }

  loadCartItems() {
    if (!this.authService.isUserLoggedIn()) {
      this.setCartItems([]);
      return;
    }
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => this.setCartItems(data),
      error: () => this.setCartItems([]),
    });
  }

  private setCartItems(data: any[]) {
    const updatedData = data.map(item => ({
      ...item,
      id: item._id,
      isSelected: item.isSelected ?? true
    }));
    this.cartItemsSubject.next(updatedData);
    this.cartCountSubject.next(updatedData.length);
    this.loadedSubject.next(true);
    this.updatePriceDetails(updatedData);
  }

  getCartItems() {
    return this.cartItemsSubject.asObservable();
  }

  getSelectedItems(): any[] {
    return this.cartItemsSubject.getValue().filter(item => item.isSelected);
  }

  getCartCount() {
    return this.cartCountSubject.asObservable();
  }

  getPriceDetails() {
    return this.priceDetailsSubject.asObservable();
  }

  get appliedCoupon(): Coupon | null {
    return this.couponSubject.getValue();
  }

  /** The API has already checked the code against the current subtotal */
  applyCoupon(coupon: Coupon): void {
    this.couponSubject.next(coupon);
    this.updatePriceDetails(this.cartItemsSubject.getValue());
  }

  removeCoupon(): void {
    this.couponSubject.next(null);
    this.updatePriceDetails(this.cartItemsSubject.getValue());
  }

  updatePriceDetails(cartItems: any[]): void {
    let totalMRP = 0;
    let totalDiscount = 0;
    let totalAmount = 0;
    let totalItemsCount = 0;

    cartItems.forEach((item) => {
      if (item.isSelected) {
        totalMRP += item.mrp;
        totalAmount += item.price;
        totalDiscount += item.mrp - item.price;
        totalItemsCount += item.quantity;
      }
    });

    // Coupon discount is re-evaluated whenever the selection changes
    const coupon = this.couponSubject.getValue();
    let couponDiscount = 0;
    let couponMessage: string | null = null;
    if (coupon) {
      const result = evaluateCoupon(coupon, totalAmount);
      if ('error' in result) couponMessage = result.error;
      else couponDiscount = result.discount;
    }

    this.priceDetailsSubject.next({
      totalMRP,
      discount: totalDiscount,
      platformFee: 'Free',
      shippingFee: 'Free',
      subtotal: totalAmount,
      couponCode: coupon?.code ?? null,
      couponDiscount,
      couponMessage,
      totalAmount: totalAmount - couponDiscount,
      itemsCount: totalItemsCount,
    });
  }

  toggleSelection(cartItemId: string) {
    const item = this.cartItemsSubject.getValue().find(i => i.id === cartItemId);
    if (item) this.setSelected([item], !item.isSelected);
  }

  toggleSelectAll(isChecked: boolean) {
    this.setSelected(this.cartItemsSubject.getValue(), isChecked);
  }

  /** Update selection locally right away, then persist it */
  private setSelected(items: any[], isSelected: boolean) {
    const ids = new Set(items.map(i => i.id));
    const updatedItems = this.cartItemsSubject.getValue().map(item =>
      ids.has(item.id) ? { ...item, isSelected } : item
    );
    this.cartItemsSubject.next(updatedItems);
    this.updatePriceDetails(updatedItems);
    items.forEach(item => this.http.put(`${this.apiUrl}/${item.id}`, { isSelected }).subscribe());
  }

  /** onError receives a message for the page to show next to its button */
  addToCart(product: any, size?: string, onAdded?: () => void, onError?: (message: string) => void): void {
    if (!this.authService.isUserLoggedIn()) {
      this.router.navigate(['/public/auth']);
      return;
    }
    if (product.inventoryStatus === 'OUTOFSTOCK') {
      onError?.('This item is currently out of stock.');
      return;
    }

    // The backend increments quantity if this product is already in the cart
    this.http.post(this.apiUrl, { _id: product._id, size }).subscribe({
      next: () => {
        this.loadCartItems();
        onAdded?.();
      },
      error: (err) => onError?.(err.error?.message || 'Could not add this item to your bag. Please try again.'),
    });
  }

  isInCart(productId: string, size?: string): boolean {
    return this.cartItemsSubject.getValue().some(
      item => item.productId === productId && (item.size ?? null) === (size ?? null)
    );
  }

  updateItem(updatedItem: any): void {
    this.itemErrorSubject.next(null);
    this.http.put(`${this.apiUrl}/${updatedItem.id}`, {
      quantity: updatedItem.quantity,
      isSelected: updatedItem.isSelected,
    }).subscribe({
      next: () => this.loadCartItems(),
      error: (err) => {
        this.itemErrorSubject.next({ id: updatedItem.id, message: err.error?.message || 'Could not change the quantity. Please try again.' });
        this.loadCartItems();
      },
    });
  }

  removeFromCart(cartItemId: string): void {
    this.http.delete(`${this.apiUrl}/${cartItemId}`).subscribe(() => this.loadCartItems());
  }

  /** Remove items silently (after they've been ordered) */
  removeItems(cartItemIds: string[]): Observable<unknown> {
    if (cartItemIds.length === 0) return of(null);
    return forkJoin(cartItemIds.map(id => this.http.delete(`${this.apiUrl}/${id}`))).pipe(
      tap(() => this.loadCartItems())
    );
  }

  removeAllFromCart(): void {
    this.http.delete(this.apiUrl).subscribe(() => {
      this.couponSubject.next(null);
      this.setCartItems([]);
    });
  }
}
