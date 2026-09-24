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
  isDialogVisible: boolean = false; // ✅ Controls the visibility of the common dialog
  dialogTitle: string = ''; // ✅ Dialog title
  dialogMessage: string = ''; // ✅ Dialog message
  deleteAction: 'single' | 'all' | null = null; // ✅ Track delete type
  deleteItemId: string | null = null; // ✅ Track which item to delete

  availableQuantities: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
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
      this.isChecked = this.cartItems.length > 0 && this.cartItems.every((item) => item.isSelected);
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

  /** Selected items that can't be ordered right now */
  get hasUnavailableSelected(): boolean {
    return this.cartItems.some((item) => item.isSelected && (item.maxQuantity === 0 || item.inventoryStatus === 'OUTOFSTOCK'));
  }

  get selectedItemCount(): number {
    return this.cartItems.filter(item => item.isSelected).length;
  }

  // The service emits a fresh items array, which the subscription picks up
  toggleSelection(index: number): void {
    this.cartService.toggleSelection(this.cartItems[index].id);
  }

  toggleSelectAll(): void {
    const allSelected = this.cartItems.length > 0 && this.cartItems.every(item => item.isSelected);
    this.cartService.toggleSelectAll(!allSelected);
  }

  openDeleteDialog(action: 'single' | 'all', itemId: string | null = null): void {
    this.deleteAction = action;
    this.deleteItemId = itemId;
    this.dialogTitle = action === 'all' ? 'Clear Cart' : 'Remove Item';
    this.dialogMessage =
      action === 'all'
        ? 'Are you sure you want to remove all items from your cart?'
        : 'Are you sure you want to remove this item from your cart?';
    this.isDialogVisible = true;
  }

  confirmDelete(): void {
    if (this.deleteAction === 'all') {
      this.cartService.removeAllFromCart();
    } else if (this.deleteAction === 'single' && this.deleteItemId) {
      this.cartService.removeFromCart(this.deleteItemId);
    }

    this.closeDialog();
  }

  closeDialog(): void {
    this.isDialogVisible = false;
    this.deleteAction = null;
    this.deleteItemId = null;
  }


  openQuantityModal(item: any): void {
    // Only offer quantities that are actually in stock
    const max = Math.max(1, Math.min(10, item.maxQuantity ?? 10));
    this.availableQuantities = Array.from({ length: max }, (_, i) => i + 1);
    this.currentItem = item;
    this.selectedQuantity = item.quantity || 1;
    this.isModalVisible = true;
  }

  selectQuantity(qty: number): void {
    this.selectedQuantity = qty;
  }

  // Runs from both "Done" and the dialog's onHide, so only save once and only on change
  closeQuantityModal(): void {
    const item = this.currentItem;
    this.currentItem = null;
    this.isModalVisible = false;
    if (item && item.quantity !== this.selectedQuantity) {
      this.cartService.updateItem({ ...item, quantity: this.selectedQuantity });
    }
  }

}
