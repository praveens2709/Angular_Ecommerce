import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /** Categories with product count and a sample image (active only unless includeInactive) */
  getCategorySummary(includeInactive = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/summary`, { params: includeInactive ? { all: 'true' } : {} });
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching categories:', error);
        return throwError(() => error);
      })
    );
  }

  getCategoryById(categoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${categoryId}`).pipe(
      catchError((error) => {
        console.error('Error fetching category by ID:', error);
        return throwError(() => error);
      })
    );
  }

  addCategory(category: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, category).pipe(
      catchError((error) => {
        console.error('Error adding category:', error);
        return throwError(() => error);
      })
    );
  }

  updateCategory(categoryId: string, category: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${categoryId}`, category).pipe(
      catchError((error) => {
        console.error('Error updating category:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCategory(categoryId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${categoryId}`).pipe(
      catchError((error) => {
        console.error('Error deleting category:', error);
        return throwError(() => error);
      })
    );
  }

  getCategoryProductCount(categoryName: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count/${categoryName}`).pipe(
      map(response => response.count),
      catchError((error) => {
        console.error('Error fetching product count:', error);
        return throwError(() => error);
      })
    );
  }
}
