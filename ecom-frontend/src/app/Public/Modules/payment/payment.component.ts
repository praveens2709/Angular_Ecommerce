import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../cart/cart.service';
import { Subscription } from 'rxjs';
import { PaymentService } from '../../../Services/payment.service';

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
  private priceDetailsSub: Subscription | null = null;

  paymentMethods = [
    { key: 'recommended', name: 'Recommended', icon: 'assets/images/star.png' },
    { key: 'cod', name: 'Cash on Delivery (Cash/UPI)', icon: 'assets/images/cash.png' },
    { key: 'upi', name: 'UPI (Pay via any App)', icon: 'assets/images/upi.webp' },
    { key: 'card', name: 'Credit/Debit Card', icon: 'assets/images/card.png' }
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
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    // Subscribe to price details from CartService
    this.priceDetailsSub = this.cartService.getPriceDetails().subscribe((details) => {
      this.priceDetails = details;
    });
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

  /** Process payment and create order */
  processPayment() {
    const orderDetails = {
      userId: '65e703fef42b123456789abc', // Replace with logged-in user ID
      customerName: 'John Doe',
      totalAmount: this.priceDetails.totalAmount,
      products: [
        {
          productId: 'prod_123456',
          productName: 'Nike Shoes',
          storeName: 'Nike Store',
          size: '10',
          quantity: 1,
          price: this.priceDetails.totalAmount,
          image: 'nike-shoes.jpg',
        },
      ],
    };

    // Call payment service
    this.paymentService.payWithRazorpay(
      orderDetails.totalAmount,
      'INR',
      orderDetails,
      (order: any) => {
        console.log('Order Successfully Placed:', order);
        alert('Order placed successfully!');
      }
    );
  }
}
