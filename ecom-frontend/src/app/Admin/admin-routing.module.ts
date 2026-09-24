import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { AdminComponent } from './admin.component';
import { DashboardComponent } from './Modules/dashboard/dashboard.component';
import { ProductsComponent } from './Modules/products/products.component';
import { CategoriesComponent } from './Modules/categories/categories.component';
import { UsersComponent } from './Modules/users/users.component';
import { AuthGuard } from './auth/Services/auth.guard';
import { OrdersComponent } from './Modules/orders/orders.component';
import { RedirectGuard } from './auth/Services/redirect.guard';
import { CouponsComponent } from './Modules/coupons/coupons.component';
import { MessagesComponent } from './Modules/messages/messages.component';

const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent, // ✅ Route for authentication
    title: 'Admin login',
  },
  {
    path: '',
    canActivate: [RedirectGuard], // ✅ Check if logged in, redirect accordingly
    pathMatch: 'full',
    component: AuthComponent, // Doesn't matter, RedirectGuard will handle redirection
  },
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard], // ✅ Protect admin routes
    children: [
      { path: 'dashboard', component: DashboardComponent, title: 'Admin · Dashboard' },
      { path: 'products', component: ProductsComponent, title: 'Admin · Products' },
      { path: 'categories', component: CategoriesComponent, title: 'Admin · Categories' },
      { path: 'orders', component: OrdersComponent, title: 'Admin · Orders' },
      { path: 'users', component: UsersComponent, title: 'Admin · Users' },
      { path: 'coupons', component: CouponsComponent, title: 'Admin · Coupons' },
      { path: 'messages', component: MessagesComponent, title: 'Admin · Messages' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // ✅ Ensure `/admin` redirects to `/admin/dashboard`
    ],
  },
  { path: '**', redirectTo: 'auth' }, // ✅ Catch-all redirect
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
