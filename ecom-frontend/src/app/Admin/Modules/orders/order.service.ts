import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LastValueCache } from '../../../Services/last-value.cache';

export type OrderStatus =
  | 'Pending'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'
  | 'Return Rejected';

export interface Order {
  _id?: string;
  userId?: any;
  customerName?: string;
  groupId?: string;
  orderDate?: string;
  subtotal?: number;
  couponCode?: string;
  discount?: number;
  totalAmount?: number;
  status?: OrderStatus;
  statusHistory?: { status: OrderStatus; at: string; note?: string }[];
  deliveredAt?: string;
  returnRequest?: { type: 'Return' | 'Exchange'; reason: string; exchangeSize?: string; requestedAt: string; resolvedAt?: string };
  paymentMethod?: string;
  paymentId?: string;
  shippingAddress?: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    mobile: string;
  };
  products: {
    productId: string;
    productName: string;
    storeName: string;
    size?: string;
    quantity: number;
    price: number;
    image?: string;
  }[];
}

export interface NewOrderRequest {
  addressId: string;
  paymentMethod: 'COD' | 'UPI' | 'CARD';
  paymentId?: string;
  couponCode?: string;
  items: { productId: string; size?: string; quantity: number }[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Which statuses an admin can move an order to (mirrors the API) */
export const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  Pending: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  'Return Requested': ['Returned', 'Return Rejected'],
};

export const RETURN_WINDOW_DAYS = 7;

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private baseUrl = `${environment.apiUrl}/orders`;

  /** Last "my orders" list per user id (key supplied by the caller) */
  readonly myOrders = new LastValueCache<Order[]>();

  constructor(private http: HttpClient) { }

  // Admin: paged list, optional status filter and search
  getOrders(page: number, limit: number, filters: { status?: string; q?: string } = {}): Observable<Paged<Order>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<Paged<Order>>(this.baseUrl, { params });
  }

  // Owner or admin
  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/order/${orderId}`);
  }

  // Logged-in shopper's orders
  getMyOrders(cacheKey?: string | null): Observable<Order[]> {
    return this.myOrders.track(cacheKey, this.http.get<Order[]>(`${this.baseUrl}/my`));
  }

  // Admin: move an order along its lifecycle
  updateOrder(orderId: string, status: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${orderId}`, { status });
  }

  cancelMyOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/${orderId}/cancel`, {});
  }

  requestReturn(orderId: string, body: { type: 'Return' | 'Exchange'; reason: string; exchangeSize?: string }): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/${orderId}/return`, body);
  }

  /** GST invoice PDF for the checkout this order belongs to; triggers a browser download */
  downloadInvoice(orderId: string): Observable<void> {
    return this.http.get(`${this.baseUrl}/${orderId}/invoice`, { responseType: 'blob', observe: 'response' }).pipe(
      map((res) => {
        const disposition = res.headers.get('Content-Disposition') || '';
        const name = /filename="([^"]+)"/.exec(disposition)?.[1] || `invoice-${orderId}.pdf`;
        const url = URL.createObjectURL(res.body!);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
    );
  }

  // Admin
  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orderId}`);
  }

  // Prices, stock and coupon are decided by the server
  createOrder(order: NewOrderRequest): Observable<Order[]> {
    return this.http.post<Order[]>(this.baseUrl, order);
  }
}
