import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderService, OrderStatus, RETURN_WINDOW_DAYS } from '../../../../Admin/Modules/orders/order.service';
import { SIZES } from '../../../../Admin/Modules/products/product.service';

interface TimelineStep {
  label: string;
  icon: string;
  at?: string;
  done: boolean;
  current: boolean;
  tone?: 'danger' | 'warn';
}

@Component({
  selector: 'app-order-details',
  standalone: false,
  
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css'
})

export class OrderDetailsComponent implements OnInit {
  order: Order | null = null;
  orderId: string = '';
  notFound = false;
  isDialogVisible: boolean = false;

  isReturnDialogVisible = false;
  returnType: 'Return' | 'Exchange' = 'Return';
  returnReason = '';
  exchangeSize = '';
  isSubmitting = false;
  downloadingInvoice = false;
  readonly sizes = SIZES;
  readonly returnReasons = ['Size too small', 'Size too large', 'Quality not as expected', 'Received wrong item', 'Changed my mind'];

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.fetchOrderDetails();
    }
  }

  fetchOrderDetails() {
    this.orderService.getOrderById(this.orderId).subscribe({
      next: (order) => (this.order = order),
      error: () => (this.notFound = true),
    });
  }

  invoiceError = '';
  cancelError = '';
  returnError = '';

  /** Invoices exist for everything except cancelled or free replacement orders */
  get canDownloadInvoice(): boolean {
    return !!this.order && this.order.status !== 'Cancelled' && (this.order.totalAmount ?? 0) > 0;
  }

  downloadInvoice(): void {
    if (this.downloadingInvoice) return;
    this.downloadingInvoice = true;
    this.invoiceError = '';
    this.orderService.downloadInvoice(this.orderId).subscribe({
      next: () => (this.downloadingInvoice = false),
      error: () => {
        this.downloadingInvoice = false;
        this.invoiceError = 'The invoice is not available right now. Please try again in a moment.';
      },
    });
  }

  get canCancel(): boolean {
    return this.order?.status === 'Pending';
  }

  /** Delivered and still inside the return window */
  get canReturn(): boolean {
    if (this.order?.status !== 'Delivered') return false;
    return !!this.returnDeadline && this.returnDeadline > new Date();
  }

  get returnDeadline(): Date | null {
    const base = this.order?.deliveredAt || this.order?.orderDate;
    if (!base) return null;
    return new Date(new Date(base).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }

  /** Pending → Shipped → Delivered, with cancel/return branches */
  get timeline(): TimelineStep[] {
    if (!this.order) return [];
    const history = this.order.statusHistory || [];
    const at = (status: OrderStatus) => history.find((h) => h.status === status)?.at;
    const status = this.order.status!;

    if (status === 'Cancelled') {
      return [
        { label: 'Ordered', icon: 'pi-shopping-bag', at: at('Pending') || this.order.orderDate, done: true, current: false },
        { label: 'Cancelled', icon: 'pi-times', at: at('Cancelled'), done: true, current: true, tone: 'danger' },
      ];
    }

    const steps: TimelineStep[] = [
      { label: 'Ordered', icon: 'pi-shopping-bag', at: at('Pending') || this.order.orderDate, done: true, current: status === 'Pending' },
      { label: 'Shipped', icon: 'pi-truck', at: at('Shipped'), done: status !== 'Pending', current: status === 'Shipped' },
      {
        label: 'Delivered',
        icon: 'pi-check',
        at: at('Delivered') || this.order.deliveredAt,
        done: !['Pending', 'Shipped'].includes(status),
        current: status === 'Delivered',
      },
    ];
    if (['Return Requested', 'Returned', 'Return Rejected'].includes(status)) {
      const type = this.order.returnRequest?.type || 'Return';
      steps.push({ label: `${type} requested`, icon: 'pi-replay', at: at('Return Requested'), done: true, current: status === 'Return Requested', tone: 'warn' });
      if (status === 'Returned') {
        steps.push({ label: type === 'Exchange' ? 'Exchange approved' : 'Returned', icon: 'pi-check-circle', at: at('Returned'), done: true, current: true });
      }
      if (status === 'Return Rejected') {
        steps.push({ label: 'Request declined', icon: 'pi-ban', at: at('Return Rejected'), done: true, current: true, tone: 'danger' });
      }
    }
    return steps;
  }

  showCancelDialog() {
    this.cancelError = '';
    this.isDialogVisible = true;
  }

  closeDialog() {
    this.isDialogVisible = false;
  }

  confirmCancelOrder() {
    if (!this.orderId) return;

    this.orderService.cancelMyOrder(this.orderId).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.closeDialog();
      },
      error: (error) => {
        // Keep the dialog open with the reason (e.g. it has already shipped)
        this.cancelError = error.error?.message || 'Could not cancel this order. Please try again.';
      },
    });
  }

  openReturnDialog(): void {
    this.returnType = 'Return';
    this.returnReason = '';
    this.exchangeSize = '';
    this.returnError = '';
    this.isReturnDialogVisible = true;
  }

  get canSubmitReturn(): boolean {
    if (!this.returnReason.trim()) return false;
    return this.returnType === 'Return' || (!!this.exchangeSize && this.exchangeSize !== this.order?.products[0]?.size);
  }

  submitReturn(): void {
    if (!this.canSubmitReturn || this.isSubmitting) return;
    this.isSubmitting = true;
    this.returnError = '';
    this.orderService
      .requestReturn(this.orderId, {
        type: this.returnType,
        reason: this.returnReason.trim(),
        exchangeSize: this.returnType === 'Exchange' ? this.exchangeSize : undefined,
      })
      .subscribe({
        next: (order) => {
          this.isSubmitting = false;
          this.order = order;
          this.isReturnDialogVisible = false;
        },
        error: (error) => {
          this.isSubmitting = false;
          this.returnError = error.error?.message || 'Could not submit your request. Please try again.';
        },
      });
  }

  getStatusIcon(status?: string): string {
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

  getStatusClass(status?: string): string {
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
