import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Coupon, CouponService, describeCoupon } from '../../../Services/coupon.service';

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

  constructor(private couponService: CouponService, private fb: FormBuilder) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{3,20}$/)]],
      description: [''],
      type: ['PERCENT', Validators.required],
      value: [10, [Validators.required, Validators.min(1)]],
      minOrder: [0, [Validators.min(0)]],
      maxDiscount: [0, [Validators.min(0)]],
      startsAt: [''],
      expiresAt: [''],
      active: [true],
      firstOrderOnly: [false],
      oncePerUser: [false],
      usageLimit: [0, [Validators.min(0)]],
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

  isScheduled(coupon: Coupon): boolean {
    return !!coupon.startsAt && new Date(coupon.startsAt) > new Date();
  }

  /** Short labels for the rules, shown under the offer */
  rules(coupon: Coupon): string[] {
    return [
      coupon.firstOrderOnly ? 'First order only' : '',
      coupon.oncePerUser ? 'Once per customer' : '',
      coupon.usageLimit ? `First ${coupon.usageLimit} uses` : '',
    ].filter(Boolean);
  }

  saveError = '';
  deleteError = '';
  rowError: { id: string; message: string } | null = null;

  openDialog(coupon?: Coupon): void {
    this.editingId = coupon?._id ?? null;
    this.saveError = '';
    this.form.reset({
      code: coupon?.code ?? '',
      description: coupon?.description ?? '',
      type: coupon?.type ?? 'PERCENT',
      value: coupon?.value ?? 10,
      minOrder: coupon?.minOrder ?? 0,
      maxDiscount: coupon?.maxDiscount ?? 0,
      startsAt: coupon?.startsAt ? coupon.startsAt.slice(0, 10) : '',
      expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      active: coupon?.active ?? true,
      firstOrderOnly: coupon?.firstOrderOnly ?? false,
      oncePerUser: coupon?.oncePerUser ?? false,
      usageLimit: coupon?.usageLimit ?? 0,
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
      // From the start of the start day to the end of the expiry day (shop's local time)
      startsAt: value.startsAt ? new Date(`${value.startsAt}T00:00:00`).toISOString() : null,
      expiresAt: value.expiresAt ? new Date(`${value.expiresAt}T23:59:59`).toISOString() : null,
      usageLimit: Number(value.usageLimit) || 0,
    };
    const request = this.editingId ? this.couponService.update(this.editingId, body) : this.couponService.create(body);
    this.saveError = '';
    request.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.load();
      },
      error: (err) => (this.saveError = err.error?.message || 'Could not save. Please check the form.'),
    });
  }

  toggleActive(coupon: Coupon): void {
    this.rowError = null;
    this.couponService.update(coupon._id!, { active: !coupon.active }).subscribe({
      next: () => (coupon.active = !coupon.active),
      error: (err) => (this.rowError = { id: coupon._id!, message: err.error?.message || 'Could not update. Please try again.' }),
    });
  }

  openDelete(coupon: Coupon): void {
    this.deleteError = '';
    this.deleteTarget = coupon;
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!target?._id) return;
    this.deleteError = '';
    this.couponService.remove(target._id).subscribe({
      next: () => {
        this.deleteTarget = null;
        this.load();
      },
      error: (err) => (this.deleteError = err.error?.message || 'Could not delete. Please try again.'),
    });
  }
}
