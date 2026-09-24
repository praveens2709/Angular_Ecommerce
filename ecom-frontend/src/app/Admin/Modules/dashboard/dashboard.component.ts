import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DashboardService } from './dashboard.service';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#ffb64d',
  Shipped: '#4099ff',
  Delivered: '#2ed8b6',
  Cancelled: '#ff5370',
  'Return Requested': '#9c6ade',
  Returned: '#7a8699',
  'Return Rejected': '#c0392b',
};

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [CurrencyPipe],
})
export class DashboardComponent implements OnInit {
  loading = true;
  dashboardData: any = {
    products: { total: 0, instock: 0, lowstock: 0, outOfStock: 0 },
    categories: { total: 0, active: 0, inactive: 0 },
    orders: { total: 0, pending: 0, completed: 0, byStatus: {} },
    users: { total: 0, active: 0, inactive: 0 },
    revenue: { total: 0, orders: 0, averageOrder: 0 },
    daily: [],
    topProducts: [],
    lowStock: [],
  };

  salesChart: any;
  salesOptions: any;
  statusChart: any;
  statusOptions: any;

  constructor(private dashboardService: DashboardService, private currency: CurrencyPipe) {}

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.buildCharts();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get hasOrders(): boolean {
    return (this.dashboardData.orders?.total || 0) > 0;
  }

  private buildCharts(): void {
    const daily = this.dashboardData.daily || [];
    const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    this.salesChart = {
      labels: daily.map((d: any) => label(d.date)),
      datasets: [
        {
          type: 'line',
          label: 'Revenue (₹)',
          data: daily.map((d: any) => d.revenue),
          borderColor: '#4099ff',
          backgroundColor: 'rgba(64, 153, 255, 0.15)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Orders',
          data: daily.map((d: any) => d.orders),
          backgroundColor: 'rgba(255, 182, 77, 0.7)',
          borderRadius: 4,
          yAxisID: 'y1',
        },
      ],
    };
    this.salesOptions = {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              ctx.dataset.yAxisID === 'y'
                ? ` Revenue: ${this.currency.transform(ctx.parsed.y, 'INR', 'symbol', '1.0-0')}`
                : ` Orders: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, position: 'left', ticks: { callback: (v: number) => `₹${v}` } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { precision: 0 } },
      },
    };

    const byStatus = this.dashboardData.orders?.byStatus || {};
    const statuses = Object.keys(byStatus);
    this.statusChart = {
      labels: statuses,
      datasets: [{ data: statuses.map((s) => byStatus[s]), backgroundColor: statuses.map((s) => STATUS_COLORS[s] || '#999') }],
    };
    this.statusOptions = { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } };
  }
}
