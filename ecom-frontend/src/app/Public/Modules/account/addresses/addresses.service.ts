import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private apiUrl = `${environment.apiUrl}/addresses`;

  constructor(private http: HttpClient) {}

  getAddresses(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}`);
  }

  addAddress(address: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, address);
  }

  updateAddress(addressId: string, address: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${addressId}`, address);
  }
  
  deleteAddress(addressId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${addressId}`);
  }  
}
