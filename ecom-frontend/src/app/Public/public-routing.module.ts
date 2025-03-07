import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './Modules/home/home.component';
import { CartComponent } from './Modules/cart/cart.component';
import { AccountComponent } from './Modules/account/account.component';
import { ProductComponent } from './Modules/product/product.component';
import { ProductDetailsComponent } from './Modules/product-details/product-details.component';
import { AddressComponent } from './Modules/address/address.component';
import { PaymentComponent } from './Modules/payment/payment.component';
import { OverviewComponent } from './Modules/account/overview/overview.component';
import { UserOrdersComponent } from './Modules/account/user-orders/user-orders.component';
import { ProfileDetailsComponent } from './Modules/account/profile-details/profile-details.component';
import { EditProfileComponent } from './Modules/account/edit-profile/edit-profile.component';
import { AddressesComponent } from './Modules/account/addresses/addresses.component';
import { CardsComponent } from './Modules/account/cards/cards.component';
import { DeleteAccountComponent } from './Modules/account/delete-account/delete-account.component';
import { AuthComponent } from './auth/auth.component';
import { OrderDetailsComponent } from './Modules/account/order-details/order-details.component';

const routes: Routes = [
  // Public login and register routes
  { path: 'public/auth', component: AuthComponent },

  // Public-facing modules (user website)
  { path: 'home', component: HomeComponent },
  { path: 'shop', component: ProductComponent },
  { path: 'product-detail/:id', component: ProductDetailsComponent },
  { path: 'cart', component: CartComponent },
  { path: 'address', component: AddressComponent },
  { path: 'payment', component: PaymentComponent },

  // Account section with child routes
  {
    path: 'account',
    component: AccountComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' }, // Default to Overview
      { path: 'overview', component: OverviewComponent },
      { path: 'orders', component: UserOrdersComponent },
      { path: 'order-details/:id', component: OrderDetailsComponent },
      { path: 'profile', component: ProfileDetailsComponent },
      { path: 'profile/edit', component: EditProfileComponent },
      { path: 'addresses', component: AddressesComponent },
      { path: 'cards', component: CardsComponent },
      { path: 'delete', component: DeleteAccountComponent },
    ],
  },

  // Catch-all route for public pages
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {}
