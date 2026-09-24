import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Paged } from '../orders/order.service';

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export interface ProductQuery {
  q?: string;
  category?: string[];
  /** e.g. ['0-500', '10000-'] */
  price?: string[];
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'discount';
  inStock?: boolean;
}

export interface Review {
  _id: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

/** Stock tracking: products without `stock` are untracked (status set by hand) */
export const isStockTracked = (product: any): boolean =>
  !!product?.stock && SIZES.some((size) => typeof product.stock[size] === 'number');

export const stockFor = (product: any, size: string): number | null =>
  isStockTracked(product) ? Number(product.stock?.[size]) || 0 : null;

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  private toParams(query: ProductQuery, page?: number, limit?: number): HttpParams {
    let params = new HttpParams();
    if (query.q?.trim()) params = params.set('q', query.q.trim());
    if (query.category?.length) params = params.set('category', query.category.join(','));
    if (query.price?.length) params = params.set('price', query.price.join(','));
    if (query.sort) params = params.set('sort', query.sort);
    if (query.inStock) params = params.set('inStock', 'true');
    if (page) params = params.set('page', page).set('limit', limit ?? 12);
    return params;
  }

  getProducts(query: ProductQuery = {}): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { params: this.toParams(query) }).pipe(
      catchError((error) => {
        console.error('Error fetching products:', error);
        return throwError(() => new Error('Error fetching products'));
      })
    );
  }

  getProductsPage(query: ProductQuery, page: number, limit: number): Observable<Paged<any>> {
    return this.http.get<Paged<any>>(this.apiUrl, { params: this.toParams(query, page, limit) });
  }

  getProductById(productId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${productId}`);
  }

  getVariants(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${productId}/variants`);
  }

  getReviews(productId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/${productId}/reviews`);
  }

  saveReview(productId: string, rating: number, comment: string): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/${productId}/reviews`, { rating, comment });
  }

  deleteMyReview(productId: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${productId}/reviews/mine`);
  }

  addProduct(product: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, product);
  }

  editProduct(product: any): Observable<any> {
    if (!product._id) {
      return throwError(() => new Error('Product ID is required for update'));
    }
    return this.http.put<any>(`${this.apiUrl}/${product._id}`, product);
  }

  deleteProduct(productId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}`);
  }
}
