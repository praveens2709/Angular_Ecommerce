import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authApiURL = `${environment.apiUrl}/auth`;

  private isAdminLoggedInSubject = new BehaviorSubject<boolean>(!!this.getAdminToken());
  private isUserLoggedInSubject = new BehaviorSubject<boolean>(!!this.getUserToken());

  constructor(private http: HttpClient) {
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
      })
    );
  }

  /** ✅ Admin Registration */
  adminRegister(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/admin/register`, { name, email, password }).pipe(
      tap((response) => {
        this.setAdminToken(response.token);
        this.isAdminLoggedInSubject.next(true);
      })
    );
  }

  /** ✅ Public User Login */
  publicLogin(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/user/login`, { email, password }).pipe(
      tap((response) => {
        this.setUserToken(response.token);
        this.isUserLoggedInSubject.next(true);
      })
    );
  }

  /** ✅ Public User Registration */
  register(firstName: string, lastName: string, email: string, password: string, mobile: string, gender: string): Observable<any> {
    return this.http.post<any>(`${this.authApiURL}/user/register`, { firstName, lastName, email, password, mobile, gender }).pipe(
      tap((response) => {
        this.setUserToken(response.token);
        this.isUserLoggedInSubject.next(true);
      })
    );
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
      console.error('Invalid token', error);
      return null;
    }
  }

  /** ✅ Get User Role & ID */
  getUserRoleAndId(): { role: string | null; id: string | null } {
    const token = this.getUserToken();
    if (!token) return { role: null, id: null };

    try {
      const decoded: any = jwtDecode(token);
      return {
        role: decoded.role || null,
        id: decoded.id || null,
      };
    } catch (error) {
      console.error('Invalid token', error);
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

  /** ✅ Admin Logout */
  logoutAdmin(): void {
    localStorage.removeItem('adminAuthToken');
    this.isAdminLoggedInSubject.next(false);
  }

  /** ✅ User Logout */
  logoutUser(): void {
    localStorage.removeItem('userAuthToken');
    this.isUserLoggedInSubject.next(false);
  }

  get isAdminLoggedIn$(): Observable<boolean> {
    return this.isAdminLoggedInSubject.asObservable();
  }

  get isUserLoggedIn$(): Observable<boolean> {
    return this.isUserLoggedInSubject.asObservable();
  }
}
