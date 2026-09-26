import { Injectable, NgZone } from '@angular/core';

declare var Razorpay: any;

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private loading?: Promise<void>;

  constructor(private zone: NgZone) {}

  /**
   * Loads Razorpay's checkout script on demand (~1 MB with its assets), instead of on every page.
   * The payment page calls this when it opens so paying doesn't wait for the download.
   */
  preload(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (typeof Razorpay !== 'undefined') return Promise.resolve();
    this.loading ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.loading = undefined; // allow a retry
        script.remove();
        reject(new Error('Razorpay failed to load'));
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }

  /** Open Razorpay checkout; resolves callbacks back inside Angular's zone */
  async payWithRazorpay(
    amount: number,
    currency: string,
    prefill: RazorpayPrefill,
    onSuccess: (paymentId: string) => void,
    onFailure: (reason: string) => void
  ) {
    try {
      await this.preload();
    } catch {
      // handled below
    }
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
