import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CartService } from './cart.service';
import { environment } from '../../../../environments/environment';
import { fakeToken, inSeconds } from '../../../testing/test-helpers';

describe('CartService', () => {
  let service: CartService;
  let http: HttpTestingController;
  const items = [
    { _id: 'a', productId: 'p1', size: 'M', price: 1000, mrp: 1600, quantity: 2, isSelected: true },
    { _id: 'b', productId: 'p2', size: null, price: 300, mrp: 400, quantity: 1, isSelected: false },
  ];

  const latest = () => {
    let value: any;
    service.getPriceDetails().subscribe((v) => (value = v)).unsubscribe();
    return value;
  };

  beforeEach(() => {
    localStorage.setItem('userAuthToken', fakeToken({ id: 'u1', role: 'user', exp: inSeconds(3600) }));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.apiUrl}/cart`).flush(items);
  });

  afterEach(() => {
    localStorage.removeItem('userAuthToken');
    http.verify();
  });

  it('totals only the selected items', () => {
    expect(latest()).toEqual(jasmine.objectContaining({ totalMRP: 1600, subtotal: 1000, discount: 600, totalAmount: 1000, itemsCount: 2 }));
  });

  it('matches cart lines by product and size', () => {
    expect(service.isInCart('p1', 'M')).toBeTrue();
    expect(service.isInCart('p1', 'L')).toBeFalse();
    expect(service.isInCart('p2')).toBeTrue();
  });

  it('re-evaluates the coupon as the selection changes', () => {
    service.applyCoupon({ code: 'SAVE10', type: 'PERCENT', value: 10, minOrder: 1200, maxDiscount: 0 });
    // 1000 is below the 1200 minimum
    expect(latest().couponDiscount).toBe(0);
    expect(latest().couponMessage).toContain('₹200 more');

    service.toggleSelection('b');
    http.expectOne(`${environment.apiUrl}/cart/b`).flush({});
    expect(latest().subtotal).toBe(1300);
    expect(latest().couponDiscount).toBe(130);
    expect(latest().totalAmount).toBe(1170);

    service.removeCoupon();
    expect(latest().totalAmount).toBe(1300);
  });

  it('sends only the product id and size when adding to the bag', () => {
    service.addToCart({ _id: 'p3', name: 'Tee', price: 1, inventoryStatus: 'INSTOCK' }, 'L');
    const req = http.expectOne((r) => r.method === 'POST' && r.url === `${environment.apiUrl}/cart`);
    expect(req.request.body).toEqual({ _id: 'p3', size: 'L' });
    req.flush({});
    http.expectOne(`${environment.apiUrl}/cart`).flush(items);
  });
});
