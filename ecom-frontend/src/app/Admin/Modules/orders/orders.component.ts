import { Component, HostListener, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TableLazyLoadEvent } from 'primeng/table';
import { ADMIN_TRANSITIONS, Order, OrderService, OrderStatus } from './order.service';
import { DashboardService } from '../dashboard/dashboard.service';

interface StatusAction {
  status: OrderStatus;
  label: string;
  icon: string;
  className: string;
  confirm: string;
}

/** Pill colour per order status (see .pill-* in admin-theme.css) */
const STATUS_PILLS: Record<string, string> = {
  Pending: 'pill-warn',
  Shipped: 'pill-indigo',
  Delivered: 'pill-success',
  Cancelled: 'pill-muted',
  'Return Requested': 'pill-purple',
  Returned: 'pill-purple',
  'Return Rejected': 'pill-danger',
};

const ACTIONS: Record<string, Omit<StatusAction, 'status'>> = {
  Shipped: { label: 'Mark as shipped', icon: 'pi-truck', className: 'btn-outline-primary', confirm: 'Mark this order as shipped?' },
  Delivered: { label: 'Mark as delivered', icon: 'pi-check-circle', className: 'btn-outline-success', confirm: 'Mark this order as delivered?' },
  Cancelled: { label: 'Cancel order', icon: 'pi-times', className: 'btn-outline-danger', confirm: 'Cancel this order? Stock will be restored.' },
  Returned: { label: 'Approve return', icon: 'pi-replay', className: 'btn-outline-success', confirm: 'Approve this request? Stock will be restored.' },
  'Return Rejected': { label: 'Decline return', icon: 'pi-ban', className: 'btn-outline-danger', confirm: 'Decline this return request?' },
};

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = true;

  statusFilter = '';
  search = '';
  private search$ = new Subject<void>();
  readonly statusFilters = ['', 'Pending', 'Shipped', 'Delivered', 'Return Requested', 'Cancelled', 'Returned', 'Return Rejected'];

  /** Orders per status for the tabs ('' = all); empty until loaded, and the tabs then show no numbers */
  statusCounts: Record<string, number> = {};

  selectedOrder: Order | null = null;
  viewDialogVisible = false;
  pendingAction: StatusAction | null = null;
  actionOrder: Order | null = null;

  constructor(private orderService: OrderService, private dashboardService: DashboardService) {
    this.search$.pipe(debounceTime(350)).subscribe(() => {
      this.first = 0;
      this.fetchOrders();
    });
  }

  ngOnInit(): void {
    this.loadStatusCounts();
  }

  /** The orders list has no per-status totals, but the dashboard summary does (one GET, read-only) */
  loadStatusCounts(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        const byStatus: Record<string, number> = data?.orders?.byStatus || {};
        this.statusCounts = { '': data?.orders?.total ?? 0, ...byStatus };
      },
      error: () => (this.statusCounts = {}),
    });
  }

  countFor(status: string): number | null {
    if (!Object.keys(this.statusCounts).length) return null;
    return this.statusCounts[status] ?? 0;
  }

  statusPill(status?: string): string {
    return STATUS_PILLS[status || ''] || 'pill-muted';
  }

  /** Short, readable order reference (the full id is in the title / details) */
  shortId(order: Order): string {
    return (order._id || '').slice(-8).toUpperCase();
  }

  itemCount(order: Order): number {
    return (order.products || []).reduce((sum, p) => sum + (p.quantity || 0), 0);
  }

  /** Subtotal before discount: stored on newer orders, otherwise summed from the lines */
  subtotalOf(order: Order): number {
    return order.subtotal ?? (order.products || []).reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
  }

  initials(name?: string): string {
    return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  /** Hover colour of a row's icon button for an action */
  toneOf(action: StatusAction): string {
    return action.className.includes('danger') ? 'danger' : action.className.includes('success') ? 'success' : '';
  }

  closeDetails(): void {
    this.viewDialogVisible = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // The confirm dialog handles its own Escape; only close the panel when it is on top
    if (this.viewDialogVisible && !this.pendingAction) this.closeDetails();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.fetchOrders();
  }

  /** Fetch one page from the API */
  loadError = '';
  invoiceError = '';
  actionError = '';

  fetchOrders(): void {
    this.loading = true;
    this.loadError = '';
    const page = Math.floor(this.first / this.rows) + 1;
    this.orderService.getOrders(page, this.rows, { status: this.statusFilter, q: this.search.trim() }).subscribe({
      next: (res) => {
        this.orders = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Could not load orders. Please refresh the page.';
      },
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.first = 0;
    this.fetchOrders();
  }

  onSearch(): void {
    this.search$.next();
  }

  getSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'Pending': return 'warn';
      case 'Shipped': return 'info';
      case 'Delivered':
      case 'Returned':
        return 'success';
      case 'Cancelled':
      case 'Return Rejected':
        return 'danger';
      case 'Return Requested': return 'contrast';
      default: return 'secondary';
    }
  }

  /** Only the moves the API allows from the current status */
  actionsFor(order: Order): StatusAction[] {
    const next = ADMIN_TRANSITIONS[order.status as OrderStatus] || [];
    return next.map((status) => {
      const action = { status, ...ACTIONS[status] };
      if (order.returnRequest?.type === 'Exchange' && status === 'Returned') {
        action.label = 'Approve exchange';
        action.confirm = `Approve the exchange to size ${order.returnRequest.exchangeSize}? A free replacement order will be created.`;
      }
      return action;
    });
  }

  downloadInvoice(order: Order): void {
    if (!order._id) return;
    this.invoiceError = '';
    this.orderService.downloadInvoice(order._id).subscribe({
      error: () => (this.invoiceError = 'Invoice unavailable. Cancelled or free replacement orders have no invoice.'),
    });
  }

  /** View order details */
  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.invoiceError = '';
    this.viewDialogVisible = true;
  }

  askAction(order: Order, action: StatusAction): void {
    this.actionOrder = order;
    this.actionError = '';
    this.pendingAction = action;
  }

  confirmAction(): void {
    const order = this.actionOrder;
    const action = this.pendingAction;
    if (!order?._id || !action) return;
    this.actionError = '';

    this.orderService.updateOrder(order._id, action.status).subscribe({
      next: (updated) => {
        this.pendingAction = null;
        this.fetchOrders();
        this.loadStatusCounts();
        if (this.selectedOrder?._id === updated._id) this.selectedOrder = { ...this.selectedOrder, ...updated };
      },
      // The confirm dialog stays open with the reason
      error: (error) => (this.actionError = error.error?.message || 'Could not update the order. Please try again.'),
    });
  }
}
