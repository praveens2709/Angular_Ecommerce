import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching products:', error);
        return throwError(() => new Error('Error fetching products'));
      })
    );
  }

  getProductById(productId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${productId}`).pipe(
      catchError((error) => {
        console.error('Error fetching product by ID:', error);
        return throwError(() => new Error('Error fetching product by ID'));
      })
    );
  }

  addProduct(product: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, product).pipe(
      catchError((error) => {
        console.error('Error adding product:', error);
        return throwError(() => new Error('Error adding product'));
      })
    );
  }

  editProduct(product: any): Observable<any> {
    if (!product._id) {
      console.error('Error: Product ID is missing in update request', product);
      return throwError(() => new Error('Product ID is required for update'));
    }
    return this.http.put<any>(`${this.apiUrl}/${product._id}`, product).pipe(
      catchError((error) => {
        console.error('Error updating product:', error);
        return throwError(() => new Error('Error updating product'));
      })
    );
  }

  deleteProduct(productId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}`).pipe(
      catchError((error) => {
        console.error('Error deleting product:', error);
        return throwError(() => new Error('Error deleting product'));
      })
    );
  }
}
