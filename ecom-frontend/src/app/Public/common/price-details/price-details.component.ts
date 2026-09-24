import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CartService } from '../../Modules/cart/cart.service';
import { Coupon, CouponService, describeCoupon } from '../../../Services/coupon.service';
import { ToastService } from '../../../Services/toast-service.service';

@Component({
  selector: 'app-price-details',
  standalone: false,

  templateUrl: './price-details.component.html',
  styleUrl: './price-details.component.css'
})
export class PriceDetailsComponent implements OnInit {
  @Input() priceDetails: any;
  @Input() buttonText?: string;
  @Input() buttonLink?: string;
  @Input() isButtonDisabled?: boolean;
  @Input() warningMessage?: string;
  /** Only the bag lets you apply or remove a coupon; later steps just show it */
  @Input() showCouponInput = false;

  @Output() buttonClick: EventEmitter<void> = new EventEmitter<void>();

  showWarning: boolean = false;
  couponCode = '';
  couponError = '';
  isApplying = false;
  suggestions: Coupon[] = [];
  readonly describe = describeCoupon;

  constructor(
    private cartService: CartService,
    private couponService: CouponService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.showCouponInput) {
      this.couponService.getActive().subscribe({
        next: (coupons) => (this.suggestions = coupons.slice(0, 3)),
        error: () => (this.suggestions = []),
      });
    }
  }

  onButtonClick(): void {
    if (!this.isButtonDisabled) {
      this.buttonClick.emit();
    } else {
      this.showWarning = true;
    }
  }

  applyCoupon(code = this.couponCode): void {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    this.isApplying = true;
    this.couponError = '';
    this.couponService.validate(trimmed, this.priceDetails?.subtotal ?? 0).subscribe({
      next: (coupon) => {
        this.isApplying = false;
        this.couponCode = '';
        this.cartService.applyCoupon(coupon);
        this.toastService.success('Coupon applied', `You saved ₹${coupon.discount}`);
      },
      error: (err) => {
        this.isApplying = false;
        this.couponError = err.error?.message || 'Could not apply coupon';
      },
    });
  }

  removeCoupon(): void {
    this.cartService.removeCoupon();
  }
}
