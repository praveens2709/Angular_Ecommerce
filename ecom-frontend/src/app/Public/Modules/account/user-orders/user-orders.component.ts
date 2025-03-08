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
    this.orderService.getOrdersByUserId(this.userId).subscribe(
      (data) => {
        this.orders = data;
      },
      (error) => {
        console.error('Error fetching orders:', error);
      }
    );
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Delivered': return 'assets/images/check.png';
      case 'Cancelled': return 'assets/images/remove.png';
      case 'Pending': return 'assets/images/pending.png';
      case 'Shipped': return 'assets/images/shipped.png';
      default: return 'assets/images/default.png';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Delivered': return 'status-delivered';
      case 'Cancelled': return 'status-cancelled';
      case 'Pending': return 'status-pending';
      case 'Shipped': return 'status-shipped';
      default: return '';
    }
  }
}
