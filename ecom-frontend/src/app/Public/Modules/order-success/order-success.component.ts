import { Component } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Shown after an order is placed. The placed orders arrive in the navigation state; on a
 * refresh (no state) the page still confirms and points to My orders.
 */
@Component({
  selector: 'app-order-success',
  standalone: false,
  templateUrl: './order-success.component.html',
  styleUrl: './order-success.component.css',
})
export class OrderSuccessComponent {
  readonly orders: any[];

  constructor(router: Router) {
    const state = router.getCurrentNavigation()?.extras.state ?? globalThis.history?.state ?? {};
    this.orders = Array.isArray(state['orders']) ? state['orders'] : [];
  }

  get total(): number {
    return this.orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  }

  get itemCount(): number {
    return this.orders.reduce(
      (sum, order) => sum + (order.items || []).reduce((n: number, item: any) => n + (item.quantity || 1), 0),
      0
    );
  }

  get items(): any[] {
    return this.orders.flatMap((order) => (order.items || []).map((item: any) => ({ ...item, orderId: order._id })));
  }

  get address(): any {
    return this.orders[0]?.shippingAddress;
  }

  get paymentLabel(): string {
    const method = this.orders[0]?.paymentMethod;
    return method === 'COD' ? 'Cash on delivery' : method === 'UPI' ? 'Paid by UPI' : method === 'CARD' ? 'Paid by card' : '';
  }

  shortId(id: string): string {
    return String(id).slice(-8).toUpperCase();
  }
}
