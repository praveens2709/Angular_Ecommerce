import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/** Business details configured on the API (.env STORE_*); unset fields are null */
export interface StoreInfo {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  supportHours: string;
  returnWindowDays: number;
  website: string | null;
}

export interface DeliveryCheck {
  pincode: string;
  valid: boolean;
  deliverable: boolean;
  verified?: boolean;
  city?: string | null;
  state?: string | null;
  days?: number;
  cod?: boolean;
  message?: string;
}

const FALLBACK: StoreInfo = {
  name: 'DopeShope',
  legalName: null,
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  gstin: null,
  supportHours: 'Mon–Sat, 10am–6pm IST',
  returnWindowDays: 7,
  website: null,
};

/** Business days from today, skipping Sundays */
export const addDeliveryDays = (days: number, from = new Date()): Date => {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++;
  }
  return date;
};

@Injectable({ providedIn: 'root' })
export class StoreService {
  private apiUrl = `${environment.apiUrl}/store`;
  readonly info$: Observable<StoreInfo>;

  constructor(private http: HttpClient) {
    this.info$ = this.http.get<StoreInfo>(`${this.apiUrl}/info`).pipe(
      catchError(() => of(FALLBACK)),
      shareReplay(1)
    );
  }

  checkPincode(pincode: string): Observable<DeliveryCheck> {
    return this.http.get<DeliveryCheck>(`${this.apiUrl}/pincode/${pincode}`).pipe(
      catchError((err) => of(err.error?.pincode ? (err.error as DeliveryCheck) : { pincode, valid: false, deliverable: false, message: 'Could not check this pincode' }))
    );
  }

  sendContact(body: { name: string; email: string; subject: string; orderId?: string; message: string; website?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/contact`, body);
  }

  // Admin
  listMessages(status?: string): Observable<{ items: any[]; total: number; unread: number }> {
    return this.http.get<{ items: any[]; total: number; unread: number }>(`${this.apiUrl}/messages`, { params: status ? { status } : {} });
  }

  updateMessage(id: string, status: 'New' | 'Resolved'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/messages/${id}`, { status });
  }
}
