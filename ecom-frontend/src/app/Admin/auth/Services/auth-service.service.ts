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
    this.clearAdminSession();
    this.toastService.success('Logged Out', 'Goodbye Admin');
  }

  clearAdminSession(): void {
    this.removeToken('adminAuthToken');
    this.isAdminLoggedInSubject.next(false);
  }

  /** ✅ Logout User */
  logoutUser(): void {
    this.clearUserSession();
    this.toastService.success('Logged Out', 'Goodbye User');
  }

  /** Drop the user token without a toast (used when the server rejects it) */
  clearUserSession(): void {
    this.removeToken('userAuthToken');
    this.isUserLoggedInSubject.next(false);
  }

  /** Emails a reset link (the API answers the same whether or not the email exists) */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authApiURL}/user/forgot-password`, { email }).pipe(
      catchError((error) => this.handleError(error, 'Could not send reset link'))
    );
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authApiURL}/user/reset-password`, { token, password }).pipe(
      tap((res) => this.toastService.success('Password updated', res.message)),
      catchError((error) => this.handleError(error, 'Could not reset password'))
    );
  }

  /** ✅ Handle Errors */
  private handleError(error: any, message: string): Observable<never> {
    const detail = error.error?.error || error.error?.message || 'An error occurred';
    this.toastService.error(message, detail);
    return throwError(() => new Error(detail));
  }

  /** ✅ Store Admin Token */
  private setAdminToken(token: string): void {
    localStorage.setItem('adminAuthToken', token);
  }

  /** ✅ Store User Token */
  private setUserToken(token: string): void {
    localStorage.setItem('userAuthToken', token);
  }

  /** ✅ Retrieve Admin Token (null once it has expired) */
  getAdminToken(): string | null {
    return this.readToken('adminAuthToken');
  }

  /** ✅ Retrieve User Token (null once it has expired) */
  getUserToken(): string | null {
    return this.readToken('userAuthToken');
  }

  private readToken(key: string): string | null {
    let token: string | null = null;
    try {
      token = localStorage.getItem(key);
    } catch {
      return null;
    }
    if (!token) return null;
    try {
      const { exp } = jwtDecode<{ exp?: number }>(token);
      if (exp && exp * 1000 <= Date.now()) {
        this.removeToken(key);
        return null;
      }
    } catch {
      this.removeToken(key);
      return null;
    }
    return token;
  }

  private removeToken(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable
    }
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
