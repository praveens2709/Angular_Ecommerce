import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../cart/cart.service';
import { Subscription } from 'rxjs';
import { PaymentService } from '../../../Services/payment.service';
import { OrderService } from '../../../Admin/Modules/orders/order.service';
import { UsersService } from '../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { ToastService } from '../../../Services/toast-service.service';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
})
export class PaymentComponent implements OnInit, OnDestroy {
  selectedPaymentMethod = 'recommended';
  selectedRecommendedOption = '';
  selectedUPIOption = '';
  priceDetails: any = {};
  captchaCode = '';
  captchaInput = '';
  isPlacingOrder = false;
  private user: any = null;
  private priceDetailsSub: Subscription | null = null;

  paymentMethods = [
    { key: 'recommended', name: 'Recommended', icon: 'assets/images/star.png' },
    { key: 'cod', name: 'Cash on Delivery (Cash/UPI)', icon: 'assets/images/cash.png' },
    { key: 'upi', name: 'UPI (Pay via any App)', icon: 'assets/images/upi.webp' },
    { key: 'card', name: 'Credit/Debit Card', icon: 'assets/images/credit-card.png' }
  ];

  recommendedOptions = [
    { key: 'phonepe', name: 'PhonePe', icon: 'assets/images/phonepe.jpeg' },
    { key: 'gpay', name: 'Google Pay', icon: 'assets/images/gpay.png' },
    { key: 'cod', name: 'Cash on Delivery (Cash/UPI)', icon: 'assets/images/cash.png' }
  ];

  upiOptions = [
    { key: 'phonepe', name: 'PhonePe', icon: 'assets/images/phonepe.jpeg' },
    { key: 'gpay', name: 'Google Pay', icon: 'assets/images/gpay.png' }
  ];

  constructor(
    private cartService: CartService,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private usersService: UsersService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Refreshing this page loses the chosen address; send the shopper back to pick one
    if (!this.cartService.checkoutAddress) {
      this.router.navigate(['/address']);
      return;
    }
    this.refreshCaptcha();

    // Subscribe to price details from CartService
    this.priceDetailsSub = this.cartService.getPriceDetails().subscribe((details) => {
      this.priceDetails = details;
    });

    const { id } = this.authService.getUserRoleAndId();
    if (id) {
      this.usersService.getUserById(id).subscribe((user) => (this.user = user));
    }
  }

  ngOnDestroy(): void {
    if (this.priceDetailsSub) this.priceDetailsSub.unsubscribe();
  }

  handlePaymentMethodChange(method: string): void {
    this.selectedPaymentMethod = method;
    this.selectedRecommendedOption = '';
    this.selectedUPIOption = '';
  }

  handleRecommendedOptionChange(option: string): void {
    this.selectedRecommendedOption = option;
  }

  handleUPIOptionChange(option: string): void {
    this.selectedUPIOption = option;
  }

  refreshCaptcha(): void {
    this.captchaCode = String(Math.floor(10000 + Math.random() * 90000));
    this.captchaInput = '';
  }

  get isCaptchaValid(): boolean {
    return this.captchaInput.replace(/\s/g, '') === this.captchaCode;
  }

  placeCodOrder(): void {
    if (!this.isCaptchaValid) {
      this.toastService.error('Invalid code', 'Please enter the code shown in the image.');
      return;
    }
    this.createOrder('COD');
  }

  /** Cash on delivery from the Recommended tab, otherwise go through Razorpay */
  payRecommended(): void {
    this.selectedRecommendedOption === 'cod' ? this.createOrder('COD') : this.processPayment('UPI');
  }

  /** Collect payment via Razorpay, then create the order */
  processPayment(method: 'UPI' | 'CARD'): void {
    if (!this.hasItemsToOrder()) return;

    this.paymentService.payWithRazorpay(
      this.priceDetails.totalAmount,
      'INR',
      { name: this.user?.fullName, email: this.user?.email, contact: this.user?.mobile },
      (paymentId) => this.createOrder(method, paymentId),
      (reason) => this.toastService.error('Payment not completed', reason)
    );
  }

  private hasItemsToOrder(): boolean {
    if (this.cartService.getSelectedItems().length === 0) {
      this.toastService.error('Nothing to order', 'Please select at least one item in your bag.');
      this.router.navigate(['/cart']);
      return false;
    }
    return true;
  }

  private createOrder(paymentMethod: 'COD' | 'UPI' | 'CARD', paymentId?: string): void {
    if (this.isPlacingOrder || !this.hasItemsToOrder()) return;
    const address = this.cartService.checkoutAddress;
    if (!address?._id) {
      this.router.navigate(['/address']);
      return;
    }

    this.isPlacingOrder = true;
    this.orderService.createOrder({
      addressId: address._id,
      paymentMethod,
      paymentId,
      couponCode: this.cartService.appliedCoupon?.code,
      items: this.cartService.getSelectedItems().map((item) => ({
        productId: item.productId,
        size: item.size || undefined,
        quantity: item.quantity,
      })),
    }).subscribe({
      next: () => {
        // The server removed the ordered lines from the bag
        this.cartService.removeCoupon();
        this.cartService.loadCartItems();
        this.toastService.success('Order placed', 'Your order has been placed successfully!');
        this.router.navigate(['/account/orders']);
      },
      error: (err) => {
        this.isPlacingOrder = false;
        this.toastService.error('Order failed', err.error?.message || 'Could not place your order.');
        // Stock or prices may have changed
        this.cartService.loadCartItems();
      },
    });
  }

}
