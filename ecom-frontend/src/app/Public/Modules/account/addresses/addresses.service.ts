import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../Services/toast-service.service';

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private apiUrl = `${environment.apiUrl}/addresses`;

  constructor(private http: HttpClient, private toastService: ToastService) {}

  /** ✅ Get Addresses */
  getAddresses(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}`).pipe(
      catchError((error) => this.handleError(error, 'Failed to load addresses'))
    );
  }

  /** ✅ Add Address */
  addAddress(address: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, address).pipe(
      tap(() => this.toastService.success('Success', 'Address added successfully!')),
      catchError((error) => this.handleError(error, 'Failed to add address'))
    );
  }

  /** ✅ Update Address */
  updateAddress(addressId: string, address: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${addressId}`, address).pipe(
      tap(() => this.toastService.success('Success', 'Address updated successfully!')),
      catchError((error) => this.handleError(error, 'Failed to update address'))
    );
  }
  
  /** ✅ Delete Address */
  deleteAddress(addressId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${addressId}`).pipe(
      tap(() => this.toastService.success('Removed', 'Address removed successfully!')),
      catchError((error) => this.handleError(error, 'Failed to delete address'))
    );
  }

  /** ✅ Handle Errors */
  private handleError(error: any, message: string): Observable<never> {
    this.toastService.error('Error', error.error?.message || message);
    return throwError(() => new Error(error.error?.message || message));
  }
}
