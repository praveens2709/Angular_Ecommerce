import { Injectable, NgZone } from '@angular/core';

declare var Razorpay: any;

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private zone: NgZone) {}

  /** Open Razorpay checkout; resolves callbacks back inside Angular's zone */
  payWithRazorpay(
    amount: number,
    currency: string,
    prefill: RazorpayPrefill,
    onSuccess: (paymentId: string) => void,
    onFailure: (reason: string) => void
  ) {
    if (typeof Razorpay === 'undefined') {
      onFailure('Payment gateway failed to load. Check your connection and try again.');
      return;
    }

    const options = {
      key: 'rzp_test_2ZWOz5sEOhPm6M', // Razorpay test Key ID
      amount: Math.round(amount * 100), // Convert amount to paise
      currency: currency,
      name: 'DopeShope',
      description: 'Order Payment',
      handler: (response: any) => this.zone.run(() => onSuccess(response.razorpay_payment_id)),
      modal: {
        ondismiss: () => this.zone.run(() => onFailure('Payment cancelled')),
      },
      prefill,
      theme: {
        color: '#992603',
      },
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (response: any) =>
      this.zone.run(() => onFailure(response.error?.description || 'Payment failed'))
    );
    rzp.open();
  }
}
