import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LastValueCache } from '../../../../Services/last-value.cache';

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private apiUrl = `${environment.apiUrl}/addresses`;

  /** Last list per user id (key supplied by the caller) */
  readonly lists = new LastValueCache<any[]>();

  constructor(private http: HttpClient) {}

  /** ✅ Get the logged-in user's addresses */
  getAddresses(cacheKey?: string | null): Observable<any[]> {
    return this.lists.track(cacheKey, this.http.get<any[]>(this.apiUrl)).pipe(
      catchError((error) => this.handleError(error, 'Failed to load addresses'))
    );
  }

  /** ✅ Add Address */
  addAddress(address: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, address).pipe(
      catchError((error) => this.handleError(error, 'Failed to add address'))
    );
  }

  /** ✅ Update Address */
  updateAddress(addressId: string, address: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${addressId}`, address).pipe(
      catchError((error) => this.handleError(error, 'Failed to update address'))
    );
  }
  
  /** ✅ Delete Address */
  deleteAddress(addressId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${addressId}`).pipe(
      catchError((error) => this.handleError(error, 'Failed to delete address'))
    );
  }

  /** Rejects with a readable message for the page to show inline */
  private handleError(error: any, message: string): Observable<never> {
    const detail = error.error?.message || error.error?.error || message;
    return throwError(() => new Error(detail));
  }
}
