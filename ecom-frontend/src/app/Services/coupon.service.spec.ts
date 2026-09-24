import { Coupon, describeCoupon, evaluateCoupon } from './coupon.service';

describe('coupon rules', () => {
  const percent: Coupon = { code: 'SAVE10', type: 'PERCENT', value: 10, minOrder: 500, maxDiscount: 150 };
  const flat: Coupon = { code: 'FLAT100', type: 'FLAT', value: 100, minOrder: 0, maxDiscount: 0 };

  it('applies a percentage and respects the cap', () => {
    expect(evaluateCoupon(percent, 1000)).toEqual({ discount: 100 });
    expect(evaluateCoupon(percent, 5000)).toEqual({ discount: 150 });
  });

  it('asks for more items below the minimum order', () => {
    const result = evaluateCoupon(percent, 400);
    expect('error' in result && result.error).toContain('₹100 more');
  });

  it('never discounts more than the subtotal', () => {
    expect(evaluateCoupon(flat, 60)).toEqual({ discount: 60 });
  });

  it('describes coupons for shoppers', () => {
    expect(describeCoupon(percent)).toBe('10% off up to ₹150 on orders above ₹500');
    expect(describeCoupon(flat)).toBe('₹100 off');
    expect(describeCoupon({ ...flat, description: 'Festive offer' })).toBe('Festive offer');
  });
});
