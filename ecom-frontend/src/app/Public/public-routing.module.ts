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
import { userAuthGuard } from '../Admin/auth/Services/user-auth.guard';
import { WishlistComponent } from './Modules/account/wishlist/wishlist.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { InfoPageComponent } from './Modules/info-page/info-page.component';
import { ContactComponent } from './Modules/contact/contact.component';

const routes: Routes = [
  // Public login and register routes
  { path: 'public/auth', component: AuthComponent, title: 'Sign in' },
  { path: 'public/reset-password', component: ResetPasswordComponent, title: 'Reset password' },

  // Public-facing modules (user website)
  { path: 'home', component: HomeComponent },
  { path: 'shop', component: ProductComponent, title: 'Shop', data: { description: 'Shop DopeShope T-shirts, shirts and more. Filter by category, price and rating.' } },
  { path: 'product-detail/:id', component: ProductDetailsComponent, data: { seoManaged: true } },
  { path: 'cart', component: CartComponent, canActivate: [userAuthGuard], title: 'Bag' },
  { path: 'address', component: AddressComponent, canActivate: [userAuthGuard], title: 'Delivery address' },
  // Company & policy pages
  { path: 'about', component: InfoPageComponent, title: 'About Us', data: { page: 'about', description: 'The story behind DopeShope: comfortable everyday clothing at fair prices.' } },
  { path: 'shipping-policy', component: InfoPageComponent, title: 'Shipping Policy', data: { page: 'shipping', description: 'Free shipping across India, cash on delivery and delivery times.' } },
  { path: 'returns-policy', component: InfoPageComponent, title: 'Returns, Refunds & Cancellation', data: { page: 'returns', description: 'Cancel before shipping, 7-day returns and size exchanges, and how refunds work.' } },
  { path: 'privacy-policy', component: InfoPageComponent, title: 'Privacy Policy', data: { page: 'privacy', description: 'What personal data DopeShope collects, why, and your choices.' } },
  { path: 'terms', component: InfoPageComponent, title: 'Terms & Conditions', data: { page: 'terms', description: 'The terms for using DopeShope and buying from us.' } },
  { path: 'contact', component: ContactComponent, title: 'Contact Us', data: { description: 'Get help with orders, sizing, returns and payments.' } },
  { path: 'payment', component: PaymentComponent, canActivate: [userAuthGuard], title: 'Payment' },

  // Account section with child routes
  {
    path: 'account',
    component: AccountComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' }, // Default to Overview
      { path: 'overview', component: OverviewComponent, title: 'My account' },
      { path: 'orders', component: UserOrdersComponent, title: 'My orders' },
      { path: 'wishlist', component: WishlistComponent, title: 'Wishlist' },
      { path: 'order-details/:id', component: OrderDetailsComponent, title: 'Order details' },
      { path: 'profile', component: ProfileDetailsComponent, title: 'Profile' },
      { path: 'profile/edit', component: EditProfileComponent, title: 'Edit profile' },
      { path: 'addresses', component: AddressesComponent, title: 'Addresses' },
      { path: 'cards', component: CardsComponent, title: 'Saved cards' },
      { path: 'delete', component: DeleteAccountComponent, title: 'Delete account' },
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
