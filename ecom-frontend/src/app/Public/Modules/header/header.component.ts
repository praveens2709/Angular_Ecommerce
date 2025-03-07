import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService } from '../cart/cart.service';

@Component({
  selector: 'app-header',
  standalone: false,
  
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  cartCount: number = 0;
  private cartCountSub: Subscription | null = null;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartService.getCartItems();
    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });
  }

  ngOnDestroy(): void {
    if (this.cartCountSub) {
      this.cartCountSub.unsubscribe();
    }
  }
}