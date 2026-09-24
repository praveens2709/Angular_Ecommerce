import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Coupon {
  _id?: string;
  code: string;
  description?: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrder: number;
  maxDiscount: number;
  expiresAt?: string | null;
  active?: boolean;
}

/** Same rule as the API; used to show the discount live while the bag changes */
export const evaluateCoupon = (coupon: Coupon, subtotal: number): { discount: number } | { error: string } => {
  if (subtotal < coupon.minOrder) return { error: `Add items worth ₹${coupon.minOrder - subtotal} more to use ${coupon.code}` };
  let discount = coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'PERCENT' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return { discount: Math.min(Math.round(discount), subtotal) };
};

export const describeCoupon = (c: Coupon): string =>
  c.description ||
  (c.type === 'PERCENT'
    ? `${c.value}% off${c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ''}${c.minOrder ? ` on orders above ₹${c.minOrder}` : ''}`
    : `₹${c.value} off${c.minOrder ? ` on orders above ₹${c.minOrder}` : ''}`);

@Injectable({ providedIn: 'root' })
export class CouponService {
  private apiUrl = `${environment.apiUrl}/coupons`;

  constructor(private http: HttpClient) {}

  getActive(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.apiUrl}/active`);
  }

  validate(code: string, subtotal: number): Observable<Coupon & { discount: number }> {
    return this.http.post<Coupon & { discount: number }>(`${this.apiUrl}/validate`, { code, subtotal });
  }

  // Admin
  list(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(this.apiUrl);
  }

  create(coupon: Coupon): Observable<Coupon> {
    return this.http.post<Coupon>(this.apiUrl, coupon);
  }

  update(id: string, coupon: Partial<Coupon>): Observable<Coupon> {
    return this.http.put<Coupon>(`${this.apiUrl}/${id}`, coupon);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
