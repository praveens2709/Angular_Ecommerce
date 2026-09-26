import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DashboardService } from './dashboard.service';

// Same hues as the status pills in the orders table
const STATUS_COLORS: Record<string, string> = {
  Pending: '#e0a23a',
  Shipped: '#5b4fd6',
  Delivered: '#2f9e64',
  Cancelled: '#b8aca7',
  'Return Requested': '#a36ad8',
  Returned: '#7a3db8',
  'Return Rejected': '#c8463d',
};

const BRAND = '#992603';
const MUTED = '#8a7d78';
const GRID = '#f3ece9';

/** Change of the last 7 days against the 7 before them */
export interface Trend {
  dir: 'up' | 'down' | 'flat';
  label: string;
}

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

  revenueTrend: Trend | null = null;
  ordersTrend: Trend | null = null;
  revenueLast7 = 0;
  ordersLast7 = 0;
  revenueSpark = '';
  ordersSpark = '';

  statusLegend: { label: string; count: number; color: string }[] = [];

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

  /** Things an admin should look at, linked to the page that handles them */
  get attention(): { label: string; count: number; link: string; tone: string; icon: string }[] {
    const d = this.dashboardData;
    return [
      { label: 'Orders to ship', count: d.orders?.pending || 0, link: '/admin/orders', tone: 'warn', icon: 'pi-box' },
      { label: 'Return requests', count: d.orders?.byStatus?.['Return Requested'] || 0, link: '/admin/orders', tone: 'purple', icon: 'pi-replay' },
      { label: 'Low stock', count: d.products?.lowstock || 0, link: '/admin/products', tone: 'warn', icon: 'pi-exclamation-triangle' },
      { label: 'Out of stock', count: d.products?.outOfStock || 0, link: '/admin/products', tone: 'danger', icon: 'pi-ban' },
    ].filter((item) => item.count > 0);
  }

  /** Last 7 days vs the 7 before, from the 14-day series; null when there is nothing to compare */
  private trendOf(values: number[]): Trend | null {
    if (values.length < 14) return null;
    const last = values.slice(-7).reduce((a, v) => a + v, 0);
    const prev = values.slice(-14, -7).reduce((a, v) => a + v, 0);
    if (prev === 0) return last > 0 ? { dir: 'up', label: 'New' } : null;
    const pct = Math.round(((last - prev) / prev) * 100);
    if (pct === 0) return { dir: 'flat', label: '0%' };
    return { dir: pct > 0 ? 'up' : 'down', label: `${Math.abs(pct)}%` };
  }

  /** SVG polyline points for a 100x32 sparkline */
  private sparkline(values: number[]): string {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    return values.map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(30 - (v / max) * 28).toFixed(1)}`).join(' ');
  }

  private buildCharts(): void {
    const daily = this.dashboardData.daily || [];
    const revenue = daily.map((d: any) => Number(d.revenue) || 0);
    const orders = daily.map((d: any) => Number(d.orders) || 0);
    this.revenueTrend = this.trendOf(revenue);
    this.ordersTrend = this.trendOf(orders);
    this.revenueLast7 = revenue.slice(-7).reduce((a: number, v: number) => a + v, 0);
    this.ordersLast7 = orders.slice(-7).reduce((a: number, v: number) => a + v, 0);
    this.revenueSpark = this.sparkline(revenue);
    this.ordersSpark = this.sparkline(orders);

    const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    this.salesChart = {
      labels: daily.map((d: any) => label(d.date)),
      datasets: [
        {
          type: 'line',
          label: 'Revenue (₹)',
          data: daily.map((d: any) => d.revenue),
          borderColor: BRAND,
          backgroundColor: 'rgba(153, 38, 3, 0.07)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: BRAND,
          fill: true,
          // Monotone keeps the curve from dipping below zero between quiet days
          cubicInterpolationMode: 'monotone',
          yAxisID: 'y',
          order: 0,
        },
        {
          type: 'bar',
          label: 'Orders',
          data: daily.map((d: any) => d.orders),
          backgroundColor: '#f0d9d0',
          hoverBackgroundColor: '#e5c1b3',
          borderRadius: 6,
          maxBarThickness: 18,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    };
    this.salesOptions = {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: MUTED, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16, font: { family: 'Nunito', weight: '600' } } },
        tooltip: {
          backgroundColor: '#2a1f1c',
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: 'Nunito', weight: '700' },
          bodyFont: { family: 'Nunito' },
          callbacks: {
            label: (ctx: any) =>
              ctx.dataset.yAxisID === 'y'
                ? ` Revenue: ${this.currency.transform(ctx.parsed.y, 'INR', 'symbol', '1.0-0')}`
                : ` Orders: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: MUTED, maxRotation: 0, autoSkipPadding: 12, font: { family: 'Nunito' } } },
        y: {
          beginAtZero: true,
          position: 'left',
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: MUTED, maxTicksLimit: 5, font: { family: 'Nunito' }, callback: (v: number) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`) },
        },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, border: { display: false }, ticks: { color: MUTED, precision: 0, maxTicksLimit: 5, font: { family: 'Nunito' } } },
      },
    };

    const byStatus = this.dashboardData.orders?.byStatus || {};
    const statuses = Object.keys(byStatus);
    this.statusLegend = statuses.map((s) => ({ label: s, count: byStatus[s], color: STATUS_COLORS[s] || '#b8aca7' }));
    this.statusChart = {
      labels: statuses,
      datasets: [
        {
          data: statuses.map((s) => byStatus[s]),
          backgroundColor: statuses.map((s) => STATUS_COLORS[s] || '#b8aca7'),
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    };
    this.statusOptions = {
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        // The legend is drawn next to the chart in HTML, with counts
        legend: { display: false },
        tooltip: { backgroundColor: '#2a1f1c', padding: 10, cornerRadius: 8, bodyFont: { family: 'Nunito' } },
      },
    };
  }
}
