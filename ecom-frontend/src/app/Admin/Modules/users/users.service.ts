import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../Services/toast-service.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient, private toastService: ToastService) {}

  /** ✅ Get a single user by ID */
  getUserById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => this.handleError(error, 'Failed to load user data'))
    );
  }

  /** ✅ Get all users */
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
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
      tap(() => this.toastService.success('Success', 'Profile updated successfully!')),
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
    this.toastService.error('Error', error.error?.message || message);
    return throwError(() => new Error(error.error?.message || message));
  }
}
