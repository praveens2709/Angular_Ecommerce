import { Injectable } from '@angular/core';
import { filter } from 'rxjs/operators';
import { AuthService } from '../Admin/auth/Services/auth-service.service';
import { UsersService } from '../Admin/Modules/users/users.service';
import { AddressesService } from '../Public/Modules/account/addresses/addresses.service';
import { CardsService } from '../Public/Modules/account/cards/cards.service';
import { OrderService } from '../Admin/Modules/orders/order.service';

/** Empties the remembered account data when the shopper signs out or their session ends */
@Injectable({ providedIn: 'root' })
export class AccountCacheReset {
  constructor(auth: AuthService, users: UsersService, addresses: AddressesService, cards: CardsService, orders: OrderService) {
    auth.isUserLoggedIn$.pipe(filter((loggedIn) => !loggedIn)).subscribe(() => {
      users.profiles.clear();
      addresses.lists.clear();
      cards.lists.clear();
      orders.myOrders.clear();
    });
  }
}
