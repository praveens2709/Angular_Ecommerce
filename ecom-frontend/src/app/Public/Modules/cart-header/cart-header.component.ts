import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart-header',
  standalone: false,
  
  templateUrl: './cart-header.component.html',
  styleUrl: './cart-header.component.css'
})
export class CartHeaderComponent {
  constructor(public router: Router) {}

  isActive(path: string): boolean {
    return this.router.url === path;
  }
}
