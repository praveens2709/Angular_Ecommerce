import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart-header',
  standalone: false,
  
  templateUrl: './cart-header.component.html',
  styleUrl: './cart-header.component.css'
})
export class CartHeaderComponent {
  readonly steps = [
    { path: '/cart', label: 'Bag' },
    { path: '/address', label: 'Address' },
    { path: '/payment', label: 'Payment' },
  ];

  constructor(public router: Router) {}

  get currentIndex(): number {
    const url = this.router.url.split('?')[0];
    // Order placed: every step is done
    if (url.startsWith('/order-success')) return this.steps.length;
    return Math.max(0, this.steps.findIndex((s) => s.path === url));
  }

  isActive(path: string): boolean {
    return this.router.url.split('?')[0] === path;
  }
}
