import { Component, OnInit } from '@angular/core';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  dashboardData: any = {
    products: { total: 0, instock: 0, lowstock: 0, outOfStock: 0 },
    categories: { total: 0, active: 0, inactive: 0 },
    orders: { total: 0, pending: 0, completed: 0 },
    users: { total: 0, active: 0, inactive: 0 },
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    this.dashboardService.getDashboardData().subscribe((data) => {
      this.dashboardData = data;
    });
  }
}
