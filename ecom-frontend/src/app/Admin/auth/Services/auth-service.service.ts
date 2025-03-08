import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../Services/toast-service.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authApiURL = `${environment.apiUrl}/auth`;

  private isAdminLoggedInSubject = new BehaviorSubject<boolean>(!!this.getAdminToken());
  private isUserLoggedInSubject = new BehaviorSubject<boolean>(!!this.getUserToken());

  constructor(private http: HttpClient, private toastService: ToastService) {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    this.isAdminLoggedInSubject.next(!!this.getAdminToken());
    this.isUserLoggedInSubject.next(!!this.getUserToken());
  }

  /** ✅ Admin Login */
  adminLogin(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/admin/login`, { email, password }).pipe(
      tap((response) => {
        this.setAdminToken(response.token);
        this.isAdminLoggedInSubject.next(true);
        this.toastService.success('Login Successful', 'Welcome Admin');
      }),
      catchError((error) => this.handleError(error, 'Admin login failed'))
    );
  }

  /** ✅ Admin Registration */
  adminRegister(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/admin/register`, { name, email, password }).pipe(
      tap((response) => {
        this.setAdminToken(response.token);
        this.isAdminLoggedInSubject.next(true);
        this.toastService.success('Registration Successful', 'Welcome Admin');
      }),
      catchError((error) => this.handleError(error, 'Admin registration failed'))
    );
  }

  /** ✅ Public User Login */
  publicLogin(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/user/login`, { email, password }).pipe(
      tap((response) => {
        this.setUserToken(response.token);
        this.isUserLoggedInSubject.next(true);
        this.toastService.success('Login Successful', 'Welcome User');
      }),
      catchError((error) => this.handleError(error, 'User login failed'))
    );
  }

  /** ✅ Public User Registration */
  register(firstName: string, lastName: string, email: string, password: string, mobile: string, gender: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/user/register`, { firstName, lastName, email, password, mobile, gender }).pipe(
      tap((response) => {
        this.setUserToken(response.token);
        this.isUserLoggedInSubject.next(true);
        this.toastService.success('Registration Successful', 'Welcome User');
      }),
      catchError((error) => this.handleError(error, 'User registration failed'))
    );
  }

  /** ✅ Logout Admin */
  logoutAdmin(): void {
    localStorage.removeItem('adminAuthToken');
    this.isAdminLoggedInSubject.next(false);
    this.toastService.success('Logged Out', 'Goodbye Admin');
  }

  /** ✅ Logout User */
  logoutUser(): void {
    localStorage.removeItem('userAuthToken');
    this.isUserLoggedInSubject.next(false);
    this.toastService.success('Logged Out', 'Goodbye User');
  }

  /** ✅ Handle Errors */
  private handleError(error: any, message: string): Observable<never> {
    this.toastService.error(message, error.error?.message || 'An error occurred');
    return throwError(() => new Error(error.error?.message || message));
  }

  /** ✅ Store Admin Token */
  private setAdminToken(token: string): void {
    localStorage.setItem('adminAuthToken', token);
  }

  /** ✅ Store User Token */
  private setUserToken(token: string): void {
    localStorage.setItem('userAuthToken', token);
  }

  /** ✅ Retrieve Admin Token */
  getAdminToken(): string | null {
    return localStorage.getItem('adminAuthToken');
  }

  /** ✅ Retrieve User Token */
  getUserToken(): string | null {
    return localStorage.getItem('userAuthToken');
  }

  /** ✅ Get Admin Role from Token */
  getAdminRoleFromToken(): string | null {
    const token = this.getAdminToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.role || null;
    } catch (error) {
      this.toastService.error('Invalid Token', 'Admin authentication error');
      return null;
    }
  }

  /** ✅ Get User Role & ID */
  getUserRoleAndId(): { role: string | null; id: string | null } {
    const token = this.getUserToken();
    if (!token) return { role: null, id: null };
    try {
      const decoded: any = jwtDecode(token);
      return { role: decoded.role || null, id: decoded.id || null };
    } catch (error) {
      this.toastService.error('Invalid Token', 'User authentication error');
      return { role: null, id: null };
    }
  }

  /** ✅ Check if Admin is Logged In */
  isAdminLoggedIn(): boolean {
    return !!this.getAdminToken();
  }

  /** ✅ Check if User is Logged In */
  isUserLoggedIn(): boolean {
    return !!this.getUserToken();
  }

  get isAdminLoggedIn$(): Observable<boolean> {
    return this.isAdminLoggedInSubject.asObservable();
  }

  get isUserLoggedIn$(): Observable<boolean> {
    return this.isUserLoggedInSubject.asObservable();
  }
}
