import { Component, OnInit } from '@angular/core';
import { Order, OrderService } from './order.service';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  selectedOrder: Order | null = null;
  viewDialogVisible = false;
  shippedDialogVisible = false;
  deliveredDialogVisible = false;
  cancelDialogVisible = false;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  /** Fetch all orders */
  fetchOrders(): void {
    this.orderService.getOrders().subscribe(
      (data) => {
        this.orders = data;
      },
      (error) => {
        console.error('Error fetching orders:', error);
      }
    );
  }

  getSeverity(status?: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const validStatus = status ? status.toLowerCase() : ''; 
    switch (validStatus) {
      case 'pending': return 'warning';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  }  

  /** View order details */
  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.viewDialogVisible = true;
  }

  /** Open "Mark as Shipped" dialog */
  openShippedDialog(order: Order): void {
    this.selectedOrder = order;
    this.shippedDialogVisible = true;
  }

  /** Mark order as shipped */
  markAsShipped(): void {
    if (this.selectedOrder && this.selectedOrder._id) {
      this.updateOrderStatus(this.selectedOrder._id, 'Shipped');
    }
    this.shippedDialogVisible = false;
  }

  /** Open "Mark as Delivered" dialog */
  openDeliveredDialog(order: Order): void {
    this.selectedOrder = order;
    this.deliveredDialogVisible = true;
  }

  /** Mark order as delivered */
  markAsDelivered(): void {
    if (this.selectedOrder && this.selectedOrder._id) {
      this.updateOrderStatus(this.selectedOrder._id, 'Delivered');
    }
    this.deliveredDialogVisible = false;
  }

  /** Open "Cancel Order" dialog */
  openCancelDialog(order: Order): void {
    this.selectedOrder = order;
    this.cancelDialogVisible = true;
  }

  /** Cancel order */
  cancelOrder(): void {
    if (this.selectedOrder && this.selectedOrder._id) {
      this.updateOrderStatus(this.selectedOrder._id, 'Cancelled');
    }
    this.cancelDialogVisible = false;
  }

  /** Update order status */
  updateOrderStatus(orderId: string, status: string): void {
    this.orderService.updateOrder(orderId, status).subscribe(
      (updatedOrder) => {
        console.log(`Order ${orderId} updated to ${status}`);
        const orderIndex = this.orders.findIndex(o => o._id === orderId);
        if (orderIndex !== -1) this.orders[orderIndex].status = status;
      },
      (error) => console.error('Error updating order status:', error)
    );
  }  
}
