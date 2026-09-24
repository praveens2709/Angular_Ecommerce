import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../../../Admin/Modules/orders/order.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-user-orders',
  standalone: false,
  templateUrl: './user-orders.component.html',
  styleUrl: './user-orders.component.css'
})
export class UserOrdersComponent implements OnInit {
  orders: any[] = [];
  /** True only until the first response when nothing is remembered yet */
  loading = false;
  user: any = null; 
  userId: string | null = null;

  constructor(private orderService: OrderService, private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getUserRoleAndId();  
    this.userId = this.user?.id || null;
  
    if (this.userId) {
      this.fetchOrders();
    }
  }

  fetchOrders() {
    if (!this.userId) return;
    const cached = this.orderService.myOrders.peek(this.userId);
    if (cached) this.orders = cached;
    this.loading = !cached;
    this.orderService.getMyOrders(this.userId).subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Delivered':
      case 'Returned':
        return 'assets/images/check.png';
      case 'Cancelled':
      case 'Return Rejected':
        return 'assets/images/remove.png';
      case 'Shipped': return 'assets/images/shipped.png';
      default: return 'assets/images/pending.png';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Delivered':
      case 'Returned':
        return 'status-delivered';
      case 'Cancelled':
      case 'Return Rejected':
        return 'status-cancelled';
      case 'Shipped': return 'status-shipped';
      default: return 'status-pending';
    }
  }
}
