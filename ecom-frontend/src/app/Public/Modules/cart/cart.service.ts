import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  private apiUrl = `${environment.apiUrl}/cart`;

  constructor(private http: HttpClient) {
    this.loadCartItems();
  }

  loadCartItems() {
    this.http.get<any[]>(this.apiUrl).subscribe((data) => {
      const updatedData = data.map(item => ({
        ...item,
        id: item._id,
        isSelected: item.isSelected ?? true
      }));
      this.cartItemsSubject.next(updatedData);
      this.cartCountSubject.next(updatedData.length);
      this.updatePriceDetails(updatedData);
    });
  }

  getCartItems() {
    return this.cartItemsSubject.asObservable();
  }

  getCartCount() {
    return this.cartCountSubject.asObservable();
  }

  getPriceDetails() {
    return this.priceDetailsSubject.asObservable();
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

    this.priceDetailsSubject.next({
      totalMRP,
      discount: totalDiscount,
      platformFee: 'Free',
      shippingFee: 'Free',
      totalAmount,
      itemsCount: totalItemsCount,
    });
  }

  toggleSelection(productId: string) {
    const updatedItems = this.cartItemsSubject.getValue().map(item =>
      item.id === productId ? { ...item, isSelected: !item.isSelected } : item
    );
    this.cartItemsSubject.next(updatedItems);
    this.updatePriceDetails(updatedItems);
  }

  toggleSelectAll(isChecked: boolean) {
    const updatedItems = this.cartItemsSubject.getValue().map(item => ({
      ...item, isSelected: isChecked
    }));
    this.cartItemsSubject.next(updatedItems);
    this.updatePriceDetails(updatedItems);
  }

  addToCart(product: any): void {
    this.http.post(this.apiUrl, product).subscribe(() => {
      this.loadCartItems();
    });
  }

  updateItem(updatedItem: any): void {
    this.http.put(`${this.apiUrl}/${updatedItem.id}`, {
      quantity: updatedItem.quantity,
      isSelected: updatedItem.isSelected,
    }).subscribe(() => this.loadCartItems());
  }

  removeFromCart(productId: string): void {
    this.http.delete(`${this.apiUrl}/${productId}`).subscribe(() => {
      this.loadCartItems();
    });
  }

  removeAllFromCart(): void {
    this.http.delete(this.apiUrl).subscribe(() => {
      this.cartItemsSubject.next([]);
      this.cartCountSubject.next(0);
      this.updatePriceDetails([]);
    });
  }
}
