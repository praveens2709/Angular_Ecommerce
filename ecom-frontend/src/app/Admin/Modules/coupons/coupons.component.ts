import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Coupon, CouponService, describeCoupon } from '../../../Services/coupon.service';
import { ToastService } from '../../../Services/toast-service.service';

@Component({
  selector: 'app-coupons',
  standalone: false,
  templateUrl: './coupons.component.html',
  styleUrl: './coupons.component.css',
})
export class CouponsComponent implements OnInit {
  coupons: Coupon[] = [];
  loading = true;
  dialogVisible = false;
  deleteTarget: Coupon | null = null;
  editingId: string | null = null;
  form: FormGroup;
  readonly describe = describeCoupon;

  constructor(private couponService: CouponService, private toastService: ToastService, private fb: FormBuilder) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{3,20}$/)]],
      description: [''],
      type: ['PERCENT', Validators.required],
      value: [10, [Validators.required, Validators.min(1)]],
      minOrder: [0, [Validators.min(0)]],
      maxDiscount: [0, [Validators.min(0)]],
      expiresAt: [''],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.couponService.list().subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  isExpired(coupon: Coupon): boolean {
    return !!coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
  }

  openDialog(coupon?: Coupon): void {
    this.editingId = coupon?._id ?? null;
    this.form.reset({
      code: coupon?.code ?? '',
      description: coupon?.description ?? '',
      type: coupon?.type ?? 'PERCENT',
      value: coupon?.value ?? 10,
      minOrder: coupon?.minOrder ?? 0,
      maxDiscount: coupon?.maxDiscount ?? 0,
      expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      active: coupon?.active ?? true,
    });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    const body: Coupon = {
      ...value,
      code: value.code.trim().toUpperCase(),
      // End of the chosen day, so the coupon works all day
      expiresAt: value.expiresAt ? new Date(`${value.expiresAt}T23:59:59`).toISOString() : null,
    };
    const request = this.editingId ? this.couponService.update(this.editingId, body) : this.couponService.create(body);
    request.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.toastService.success('Saved', `Coupon ${body.code} saved`);
        this.load();
      },
      error: (err) => this.toastService.error('Could not save', err.error?.message || 'Please check the form'),
    });
  }

  toggleActive(coupon: Coupon): void {
    this.couponService.update(coupon._id!, { active: !coupon.active }).subscribe({
      next: () => (coupon.active = !coupon.active),
      error: (err) => this.toastService.error('Could not update', err.error?.message || 'Please try again'),
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    this.deleteTarget = null;
    if (!target?._id) return;
    this.couponService.remove(target._id).subscribe({
      next: () => {
        this.toastService.success('Deleted', `Coupon ${target.code} deleted`);
        this.load();
      },
      error: (err) => this.toastService.error('Could not delete', err.error?.message || 'Please try again'),
    });
  }
}
