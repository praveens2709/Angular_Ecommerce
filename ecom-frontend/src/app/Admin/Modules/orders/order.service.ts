import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Order {
  _id?: string;
  userId: string;
  customerName: string;
  orderDate?: string;
  totalAmount: number;
  status?: string;
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

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private baseUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) { }

  // Fetch all orders (Admin Panel)
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.baseUrl);
  }

  // Fetch a single order by orderId
  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/order/${orderId}`);
  }

  // get orders by id
  getOrdersByUserId(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${userId}`);
  }

  // Update order status (Admin Panel)
  updateOrder(orderId: string, status: string): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${orderId}`, { status });
  }

  // Delete an order (Admin Panel)
  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orderId}`);
  }

  // Create a new order after payment success
  createOrder(orderData: Order): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, orderData);
  }

}
