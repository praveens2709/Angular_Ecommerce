import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminComponent } from './Admin/admin.component';
import { PublicComponent } from './Public/public.component';
import { UsersComponent } from './Admin/Modules/users/users.component';
import { ProductsComponent } from './Admin/Modules/products/products.component';
import { CategoriesComponent } from './Admin/Modules/categories/categories.component';
import { AuthComponent } from './Admin/auth/auth.component';
import { HomeComponent } from './Public/Modules/home/home.component';
import { CartComponent } from './Public/Modules/cart/cart.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { DashboardComponent } from './Admin/Modules/dashboard/dashboard.component';
import { CardModule } from 'primeng/card';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { DialogModule } from 'primeng/dialog';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { BodyComponent } from './Admin/Modules/body/body.component';
import { SidenavComponent } from './Admin/Modules/sidenav/sidenav.component';
import { OrdersComponent } from './Admin/Modules/orders/orders.component';
import { HeaderComponent } from './Public/Modules/header/header.component';
import { AccountComponent } from './Public/Modules/account/account.component';
import { ProductComponent } from './Public/Modules/product/product.component';
import { CommonBannerComponent } from './Public/Modules/common-banner/common-banner.component';
import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule } from 'primeng/paginator';
import { ProductDetailsComponent } from './Public/Modules/product-details/product-details.component';
import { CartHeaderComponent } from './Public/Modules/cart-header/cart-header.component';
import { AddressComponent } from './Public/Modules/address/address.component';
import { PaymentComponent } from './Public/Modules/payment/payment.component';
import { PanelModule } from 'primeng/panel';
import { RadioButtonModule } from 'primeng/radiobutton';
import { PriceDetailsComponent } from './Public/common/price-details/price-details.component';
import { BackButtonComponent } from './Public/common/back-button/back-button.component';
import { OverviewComponent } from './Public/Modules/account/overview/overview.component';
import { AddressesComponent } from './Public/Modules/account/addresses/addresses.component';
import { CardsComponent } from './Public/Modules/account/cards/cards.component';
import { DeleteAccountComponent } from './Public/Modules/account/delete-account/delete-account.component';
import { ProfileDetailsComponent } from './Public/Modules/account/profile-details/profile-details.component';
import { InputTextModule } from 'primeng/inputtext';
import { UserOrdersComponent } from './Public/Modules/account/user-orders/user-orders.component';
import { EditProfileComponent } from './Public/Modules/account/edit-profile/edit-profile.component';
import { CalendarModule } from 'primeng/calendar';
import { AddressFormComponent } from './Public/shared/address-dialog/address-form.component';
import { OrderDetailsComponent } from './Public/Modules/account/order-details/order-details.component';
import { CommonDialogComponent } from './Public/shared/common-dialog/common-dialog.component';
import { RevealDirective } from './Public/shared/directives/reveal.directive';
import { CouponsComponent } from './Admin/Modules/coupons/coupons.component';
import { SearchBarComponent } from './Public/shared/search-bar/search-bar.component';
import { WishlistComponent } from './Public/Modules/account/wishlist/wishlist.component';
import { ScrollProgressComponent } from './Public/shared/scroll-progress/scroll-progress.component';
import { SiteFooterComponent } from './Public/shared/site-footer/site-footer.component';
import { InfoPageComponent } from './Public/Modules/info-page/info-page.component';
import { ContactComponent } from './Public/Modules/contact/contact.component';
import { MessagesComponent } from './Admin/Modules/messages/messages.component';
import { OptImgPipe } from './Public/shared/pipes/opt-img.pipe';
import { authInterceptor } from './Admin/auth/Services/auth.intercepter';
import { providePrimeNG } from 'primeng/config';
import { TitleStrategy } from '@angular/router';
import { SeoTitleStrategy } from './seo-title.strategy';
import Lara from '@primeng/themes/lara';
import { definePreset } from '@primeng/themes';

// Lara with the DopeShope brand red (#992603) as the primary colour
const DopeShopeTheme = definePreset(Lara, {
  semantic: {
    primary: {
      50: '#fdf4f2',
      100: '#fbe4de',
      200: '#f5c4b8',
      300: '#ec9a86',
      400: '#dc6a50',
      500: '#c2461f',
      600: '#aa340e',
      700: '#992603',
      800: '#7a1f05',
      900: '#5f1a07',
      950: '#360c02',
    },
  },
});

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    PublicComponent,
    DashboardComponent,
    UsersComponent,
    ProductsComponent,
    CategoriesComponent,
    HomeComponent,
    CartComponent,
    AuthComponent,
    BodyComponent,
    SidenavComponent,
    OrdersComponent,
    HeaderComponent,
    AccountComponent,
    ProductComponent,
    CommonBannerComponent,
    ProductDetailsComponent,
    CartHeaderComponent,
    AddressComponent,
    PaymentComponent,
    PriceDetailsComponent,
    BackButtonComponent,
    OverviewComponent,
    ProfileDetailsComponent,
    AddressesComponent,
    CardsComponent,
    DeleteAccountComponent,
    UserOrdersComponent,
    EditProfileComponent,
    AddressFormComponent,
    OrderDetailsComponent,
    CommonDialogComponent,
    RevealDirective,
    CouponsComponent,
    SearchBarComponent,
    WishlistComponent,
    ScrollProgressComponent,
    SiteFooterComponent,
    InfoPageComponent,
    ContactComponent,
    MessagesComponent,
    OptImgPipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    BrowserAnimationsModule,
    TableModule,
    CardModule,
    ChartModule,
    MultiSelectModule,
    DropdownModule,
    TagModule,
    InputTextModule,
    ProgressSpinnerModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    RatingModule,
    DialogModule,
    SidebarModule,
    AvatarModule,
    AccordionModule,
    CheckboxModule,
    PaginatorModule,
    PanelModule,
    RadioButtonModule,
    CalendarModule
  ],
  providers: [
    MessageService,
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // PrimeNG 19 ships no CSS files; the theme is injected at runtime.
    // Dark mode is keyed to a class we never set, so the OS theme doesn't flip components dark.
    providePrimeNG({ theme: { preset: DopeShopeTheme, options: { darkModeSelector: '.app-dark' } } }),
    provideClientHydration(withEventReplay())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
