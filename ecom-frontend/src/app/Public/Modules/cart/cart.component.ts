import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from './cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  isChecked: boolean = false;
  isModalVisible: boolean = false;
  availableQuantities: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  quantity: number = 1;
  pricePerUnit: number = 50;
  totalPrice: number = 0;
  cartItems: any[] = [];
  cartCount: number = 0;
  currentItem: any = null;
  selectedQuantity: number = 1;
  priceDetails: any = {
    totalMRP: 0,
    discount: 0,
    platformFee: 'Free',
    shippingFee: 'Free',
    totalAmount: 0,
    itemsCount: 0
  };

  private cartItemsSub: Subscription | null = null;
  private cartCountSub: Subscription | null = null;
  private priceDetailsSub: Subscription | null = null;

  constructor(private cartService: CartService) { }

  ngOnInit(): void {
    this.cartItemsSub = this.cartService.getCartItems().subscribe((data) => {
      this.cartItems = data;
      this.isChecked = this.cartItems.every((item) => item.isSelected);
    });

    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });

    this.priceDetailsSub = this.cartService.getPriceDetails().subscribe((details) => {
      this.priceDetails = details;
    });
  }

  ngOnDestroy(): void {
    this.cartItemsSub?.unsubscribe();
    this.cartCountSub?.unsubscribe();
    this.priceDetailsSub?.unsubscribe();
  }

  get selectedItemCount(): number {
    return this.cartItems.filter(item => item.isSelected).length;
  }

  toggleSelection(index: number): void {
    this.cartService.toggleSelection(this.cartItems[index].id);
    this.cartItems[index].isSelected = !this.cartItems[index].isSelected;
    this.cartService.updatePriceDetails(this.cartItems);
    this.isChecked = this.cartItems.every(item => item.isSelected);
  }

  toggleSelectAll(): void {
    const allSelected = this.cartItems.every(item => item.isSelected);
    this.isChecked = !allSelected;
    this.cartService.toggleSelectAll(this.isChecked);
    this.cartItems.forEach(item => (item.isSelected = this.isChecked));
    this.cartService.updatePriceDetails(this.cartItems);
  }  

  removeFromCart(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  removeAllFromCart(): void {
    this.cartService.removeAllFromCart();
  }

  openQuantityModal(item: any): void {
    this.currentItem = item;
    this.selectedQuantity = item.quantity || 1;
    this.isModalVisible = true;
  }

  selectQuantity(qty: number): void {
    this.selectedQuantity = qty;
  }

  closeQuantityModal(): void {
    if (this.currentItem) {
      this.currentItem.quantity = this.selectedQuantity;
      this.currentItem.price = this.currentItem.basePrice * this.selectedQuantity;
      this.currentItem.mrp = this.currentItem.baseMRP * this.selectedQuantity;

      this.cartService.updateItem(this.currentItem);
    }
    this.isModalVisible = false;
  }

  updateTotalPrice(): void {
    this.totalPrice = this.quantity * this.pricePerUnit;
  }

}
