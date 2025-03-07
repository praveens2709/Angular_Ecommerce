import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../../Admin/Modules/orders/order.service';

@Component({
  selector: 'app-order-details',
  standalone: false,
  
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css'
})

export class OrderDetailsComponent implements OnInit {
  order: any;
  orderId: string = '';
  isDialogVisible: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    console.log('Order ID:', this.orderId);
    if (this.orderId) {
      this.fetchOrderDetails();
    }
  }

  fetchOrderDetails() {
    this.orderService.getOrderById(this.orderId).subscribe(
      (order) => {
        this.order = order;
        console.log('Fetched Order:', this.order);
      },
      (error) => {
        console.error('Error fetching order:', error);
      }
    );
  }

  showCancelDialog() {
    this.isDialogVisible = true;
  }

  closeDialog() {
    this.isDialogVisible = false;
  }

  confirmCancelOrder() {
    if (!this.orderId) return;

    this.orderService.updateOrder(this.orderId, 'Cancelled').subscribe(
      (updatedOrder) => {
        this.order.status = updatedOrder.status;
        this.closeDialog();
      },
      (error) => {
        console.error('Error cancelling order:', error);
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