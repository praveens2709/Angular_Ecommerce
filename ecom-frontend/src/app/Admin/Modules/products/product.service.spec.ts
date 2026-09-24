import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService, isStockTracked, stockFor } from './product.service';
import { environment } from '../../../../environments/environment';

describe('stock helpers', () => {
  it('treats products without per-size stock as untracked', () => {
    expect(isStockTracked({})).toBeFalse();
    expect(isStockTracked({ stock: {} })).toBeFalse();
    expect(stockFor({}, 'M')).toBeNull();
  });

  it('reads stock for tracked products', () => {
    const product = { stock: { M: 3, L: 0 } };
    expect(isStockTracked(product)).toBeTrue();
    expect(stockFor(product, 'M')).toBe(3);
    expect(stockFor(product, 'L')).toBe(0);
    expect(stockFor(product, 'XS')).toBe(0);
  });
});

describe('ProductService', () => {
  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends filters, price ranges and paging as query params', () => {
    service
      .getProductsPage({ q: ' tee ', category: ['Shirts', 'Jeans'], price: ['0-500', '10000-'], sort: 'price_asc', inStock: true }, 2, 12)
      .subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/products`);
    expect(req.request.params.get('q')).toBe('tee');
    expect(req.request.params.get('category')).toBe('Shirts,Jeans');
    expect(req.request.params.get('price')).toBe('0-500,10000-');
    expect(req.request.params.get('sort')).toBe('price_asc');
    expect(req.request.params.get('inStock')).toBe('true');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('12');
    req.flush({ items: [], total: 0, page: 2, limit: 12 });
  });
});
