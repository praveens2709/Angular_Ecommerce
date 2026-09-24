import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LastValueCache } from '../../../../Services/last-value.cache';

@Injectable({
  providedIn: 'root',
})
export class CardsService {
  private apiUrl = `${environment.apiUrl}/cards`;

  /** Last list per user id (key supplied by the caller) */
  readonly lists = new LastValueCache<any[]>();

  constructor(private http: HttpClient) {}

  /** ✅ Get the logged-in user's cards (last 4 digits only) */
  getCards(cacheKey?: string | null): Observable<any[]> {
    return this.lists.track(cacheKey, this.http.get<any[]>(this.apiUrl)).pipe(
      catchError((error) => this.handleError(error, 'Error fetching cards'))
    );
  }

  /** ✅ Add a new card */
  addCard(card: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, card).pipe(
      catchError((error) => this.handleError(error, 'Error adding card'))
    );
  }

  /** ✅ Update a card */
  updateCard(cardId: string, updatedCard: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cardId}`, updatedCard).pipe(
      catchError((error) => this.handleError(error, 'Error updating card'))
    );
  }

  /** ✅ Delete a card */
  deleteCard(cardId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${cardId}`).pipe(
      catchError((error) => this.handleError(error, 'Error deleting card'))
    );
  }

  /** Rejects with a readable message for the page to show inline */
  private handleError(error: any, message: string): Observable<never> {
    const detail = error.error?.message || error.error?.error || message;
    return throwError(() => new Error(detail));
  }
}
