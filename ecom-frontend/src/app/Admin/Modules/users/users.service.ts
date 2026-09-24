import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Paged } from '../orders/order.service';
import { LastValueCache } from '../../../Services/last-value.cache';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../Services/toast-service.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  /** Last profile per user id, so account pages don't flash while refetching */
  readonly profiles = new LastValueCache<any>();

  constructor(private http: HttpClient, private toastService: ToastService) {}

  /** ✅ Get a single user by ID */
  getUserById(id: string): Observable<any> {
    return this.profiles.track(id, this.http.get<any>(`${this.apiUrl}/${id}`)).pipe(
      catchError((error) => this.handleError(error, 'Failed to load user data'))
    );
  }

  /** ✅ Admin: paged users, optional search and gender filter */
  getUsers(page: number, limit: number, filters: { q?: string; gender?: string } = {}): Observable<Paged<any>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (filters.q) params = params.set('q', filters.q);
    if (filters.gender) params = params.set('gender', filters.gender);
    return this.http.get<Paged<any>>(this.apiUrl, { params }).pipe(
      catchError((error) => this.handleError(error, 'Failed to load users'))
    );
  }

  /** ✅ Add a new user */
  addUser(user: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, user).pipe(
      tap(() => this.toastService.success('Success', 'User added successfully!')),
      catchError((error) => this.handleError(error, 'Failed to add user'))
    );
  }

  /** ✅ Edit an existing user */
  editUser(id: string, user: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user).pipe(
      tap((res) => res?.user && this.profiles.set(id, res.user)),
      tap(() => this.toastService.success('Success', 'Saved successfully!')),
      catchError((error) => this.handleError(error, 'Failed to update profile'))
    );
  }

  /** ✅ Delete a user */
  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.toastService.success('Removed', 'User deleted successfully!')),
      catchError((error) => this.handleError(error, 'Failed to delete user'))
    );
  }

  /** ✅ Handle Errors */
  private handleError(error: any, message: string): Observable<never> {
    const detail = error.error?.message || error.error?.error || message;
    this.toastService.error('Error', detail);
    return throwError(() => new Error(detail));
  }
}
