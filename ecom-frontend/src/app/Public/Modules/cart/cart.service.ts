import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';

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

  private apiUrl = 'http://localhost:3000/cart'; // Adjust the URL based on your setup

  constructor(private http: HttpClient) {
    this.loadCartItems(); // Load cart items when service is initialized
  }

  // Load cart items from the server
  loadCartItems() {
    this.http.get<any[]>(this.apiUrl).subscribe((data) => {
      const updatedData = data.map((item) => ({ ...item, isSelected: true })); // Mark all items as selected
      this.cartItemsSubject.next(updatedData);
      this.cartCountSubject.next(updatedData.length);
      this.updatePriceDetails(updatedData);
      this.updateServer(updatedData); // Ensure server reflects the updated selection
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

  // Update price details dynamically
  public updatePriceDetails(cartItems: any[]): void {
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

    const newPriceDetails = {
      totalMRP,
      discount: totalDiscount,
      platformFee: 'Free',
      shippingFee: 'Free',
      totalAmount,
      itemsCount: totalItemsCount,
    };

    this.priceDetailsSubject.next(newPriceDetails);
  }

  // Toggle individual product selection
  toggleSelection(productId: string) {
    const updatedItems = this.cartItemsSubject.getValue().map(item =>
      item.id === productId ? { ...item, isSelected: !item.isSelected } : item
    );
    this.cartItemsSubject.next(updatedItems);
    this.updateServer(updatedItems);  // Update the server with new selection
  }

  // Select or deselect all products
  toggleSelectAll(isChecked: boolean) {
    const updatedItems = this.cartItemsSubject.getValue().map(item => ({
      ...item, isSelected: isChecked
    }));
    this.cartItemsSubject.next(updatedItems);
    this.updateServer(updatedItems);  // Update the server with new selection
  }

  addToCart(product: any): void {
    const existingProductIndex = this.cartItemsSubject.getValue().findIndex(
      (item) => item.id === product.id
    );

    if (existingProductIndex !== -1) {
      const existingProduct = this.cartItemsSubject.getValue()[existingProductIndex];
      existingProduct.quantity += 1;
      existingProduct.price = existingProduct.basePrice * existingProduct.quantity;
      existingProduct.mrp = existingProduct.baseMRP * existingProduct.quantity;
    } else {
      const productWithDefaults = {
        ...product,
        quantity: 1,
        basePrice: product.price,
        baseMRP: product.mrp,
        price: product.price,
        mrp: product.mrp,
        isSelected: true,
      };
      const updatedCartItems = [...this.cartItemsSubject.getValue(), productWithDefaults];
      this.cartItemsSubject.next(updatedCartItems);
      this.cartCountSubject.next(updatedCartItems.length);

      this.http.post(this.apiUrl, productWithDefaults).subscribe();
    }

    this.updatePriceDetails(this.cartItemsSubject.getValue());
    this.updateServer(this.cartItemsSubject.getValue());
  }

  updateItem(updatedItem: any): void {
    const updatedItems = this.cartItemsSubject.getValue().map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    this.cartItemsSubject.next(updatedItems);
    this.updatePriceDetails(updatedItems);
    this.http.put(`${this.apiUrl}/${updatedItem.id}`, updatedItem).subscribe();
  }

  removeFromCart(productId: string): void {
    const updatedItems = this.cartItemsSubject.getValue().filter((item) => item.id !== productId);
    this.cartItemsSubject.next(updatedItems);
    this.cartCountSubject.next(updatedItems.length);
    this.updatePriceDetails(updatedItems);
    this.http.delete(`${this.apiUrl}/${productId}`).subscribe();
  }

  removeAllFromCart(): void {
    const cartItems = this.cartItemsSubject.getValue();
    const deleteRequests = cartItems.map(item =>
      lastValueFrom(this.http.delete(`${this.apiUrl}/${item.id}`))
    );
    Promise.all(deleteRequests)
      .then(() => {
        this.cartItemsSubject.next([]);
        this.cartCountSubject.next(0);
        this.updatePriceDetails([]);
        console.log('All products removed successfully');
      })
      .catch(err => console.error('Failed to clear cart', err));
  }  

  private updateServer(updatedItems: any[]): void {
    const updateRequests = updatedItems.map((item) =>
      lastValueFrom(this.http.put(`${this.apiUrl}/${item.id}`, item))
    );
    Promise.all(updateRequests).catch((err) => console.error('Failed to update cart', err));
  }
}
