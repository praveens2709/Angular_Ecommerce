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

const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent, // ✅ Route for authentication
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
      { path: 'dashboard', component: DashboardComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'users', component: UsersComponent },
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
