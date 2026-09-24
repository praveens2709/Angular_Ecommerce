import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../../../Services/wishlist.service';

@Component({
  selector: 'app-header',
  standalone: false,
  
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  cartCount: number = 0;
  wishlistCount = 0;
  private cartCountSub: Subscription | null = null;

  constructor(private cartService: CartService, private wishlistService: WishlistService) {}

  ngOnInit(): void {
    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });
    this.cartCountSub.add(this.wishlistService.count$.subscribe((count) => (this.wishlistCount = count)));
  }

  ngOnDestroy(): void {
    if (this.cartCountSub) {
      this.cartCountSub.unsubscribe();
    }
  }
}