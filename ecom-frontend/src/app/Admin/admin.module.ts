import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { AuthComponent } from './auth/auth.component';
import { BodyComponent } from './Modules/body/body.component';
import { SidenavComponent } from './Modules/sidenav/sidenav.component';
import { DashboardComponent } from './Modules/dashboard/dashboard.component';
import { ProductsComponent } from './Modules/products/products.component';
import { CategoriesComponent } from './Modules/categories/categories.component';
import { OrdersComponent } from './Modules/orders/orders.component';
import { UsersComponent } from './Modules/users/users.component';
import { CouponsComponent } from './Modules/coupons/coupons.component';
import { MessagesComponent } from './Modules/messages/messages.component';

/**
 * The admin panel, loaded only when someone opens /admin. Keeping it (and its charts and data
 * tables) out of the main bundle makes the storefront's first download much smaller.
 */
@NgModule({
  declarations: [
    AdminComponent,
    AuthComponent,
    BodyComponent,
    SidenavComponent,
    DashboardComponent,
    ProductsComponent,
    CategoriesComponent,
    OrdersComponent,
    UsersComponent,
    CouponsComponent,
    MessagesComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    TableModule,
    ChartModule,
    TagModule,
    DropdownModule,
    DialogModule,
    InputTextModule,
  ],
})
export class AdminModule {}
