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

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching categories:', error);
        return throwError(() => new Error('Error fetching categories'));
      })
    );
  }

  getCategoryById(categoryId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${categoryId}`).pipe(
      catchError((error) => {
        console.error('Error fetching category by ID:', error);
        return throwError(() => new Error('Error fetching category by ID'));
      })
    );
  }

  addCategory(category: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, category).pipe(
      catchError((error) => {
        console.error('Error adding category:', error);
        return throwError(() => new Error('Error adding category'));
      })
    );
  }

  updateCategory(categoryId: string, category: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${categoryId}`, category).pipe(
      catchError((error) => {
        console.error('Error updating category:', error);
        return throwError(() => new Error('Error updating category'));
      })
    );
  }

  deleteCategory(categoryId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${categoryId}`).pipe(
      catchError((error) => {
        console.error('Error deleting category:', error);
        return throwError(() => new Error('Error deleting category'));
      })
    );
  }

  getCategoryProductCount(categoryName: string): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/count/${categoryName}`).pipe(
      map(response => response.count),
      catchError((error) => {
        console.error('Error fetching product count:', error);
        return throwError(() => new Error('Error fetching product count'));
      })
    );
  }
}
