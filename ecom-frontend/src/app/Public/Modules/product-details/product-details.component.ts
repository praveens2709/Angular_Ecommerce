import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../Admin/Modules/products/product.service';
import { CartService } from '../cart/cart.service';
import { ViewportScroller } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-details',
  standalone: false,
  
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product: any;
  cartCount: number = 0;
  private cartCountSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private viewportScroller: ViewportScroller
  ) {}

  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
    this.fetchProductDetails();
    this.cartCountSub = this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });
  }

  ngOnDestroy(): void {
    if (this.cartCountSub) {
      this.cartCountSub.unsubscribe();
    }
  }

  fetchProductDetails(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.productService.getProductById(productId).subscribe((data) => {
        this.product = data;
      });
    }
  }

  addToCart(product: any): void {
    if (!product) return;
    this.cartService.addToCart(product);
    console.log('Product added to cart:', product);
  }

  getReadableStatus(status: string): string {
    switch (status) {
      case 'INSTOCK':
        return 'In Stock';
      case 'LOWSTOCK':
        return 'Low Stock';
      case 'OUTOFSTOCK':
        return 'Out of Stock';
      default:
        return 'Unknown Status';
    }
  }
}
