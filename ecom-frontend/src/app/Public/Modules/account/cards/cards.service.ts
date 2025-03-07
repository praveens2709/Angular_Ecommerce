import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CardsService {
  private apiUrl = `${environment.apiUrl}/cards`;

  constructor(private http: HttpClient) {}

  getCards(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}`).pipe(
      catchError((error) => {
        console.error('Error fetching cards:', error);
        return throwError(() => error);
      })
    );
  }

  addCard(card: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, card).pipe(
      catchError((error) => {
        console.error('Error adding card:', error);
        return throwError(() => error);
      })
    );
  }

  updateCard(cardId: string, updatedCard: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cardId}`, updatedCard).pipe(
      catchError((error) => {
        console.error('Error updating card:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCard(cardId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${cardId}`).pipe(
      catchError((error) => {
        console.error('Error deleting card:', error);
        return throwError(() => error);
      })
    );
  }
}
