import { Component } from '@angular/core';
import { WishlistService } from '../../../../Services/wishlist.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-wishlist',
  standalone: false,
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent {
  readonly items$;

  constructor(private wishlistService: WishlistService, private authService: AuthService) {
    this.items$ = this.wishlistService.items$;
  }

  trackById = (_: number, product: any) => product._id;

  get isLoggedIn(): boolean {
    return this.authService.isUserLoggedIn();
  }
}
