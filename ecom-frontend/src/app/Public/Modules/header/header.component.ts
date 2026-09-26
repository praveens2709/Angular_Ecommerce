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
  /** Briefly true when something is added, to bump the bag icon */
  bagBump = false;
  private bumpTimer?: ReturnType<typeof setTimeout>;
  private cartCountSub: Subscription | null = null;

  constructor(private cartService: CartService, private wishlistService: WishlistService) {}

  ngOnInit(): void {
    let loaded = false;
    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      // Only bump for adds, not for the bag loading in after sign-in or a refresh
      if (loaded && count > this.cartCount) this.bump();
      this.cartCount = count;
    });
    this.cartCountSub.add(this.cartService.loaded$.subscribe((isLoaded) => (loaded = isLoaded)));
    this.cartCountSub.add(this.wishlistService.count$.subscribe((count) => (this.wishlistCount = count)));
  }

  private bump(): void {
    this.bagBump = false;
    clearTimeout(this.bumpTimer);
    setTimeout(() => {
      this.bagBump = true;
      this.bumpTimer = setTimeout(() => (this.bagBump = false), 600);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.bumpTimer);
    if (this.cartCountSub) {
      this.cartCountSub.unsubscribe();
    }
  }
}