import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../Admin/auth/Services/auth-service.service';
import { ToastService } from './toast-service.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private apiUrl = `${environment.apiUrl}/wishlist`;
  private itemsSubject = new BehaviorSubject<any[]>([]);

  readonly items$ = this.itemsSubject.asObservable();
  readonly count$ = this.items$.pipe(map((items) => items.length));

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.authService.isUserLoggedIn$.pipe(distinctUntilChanged()).subscribe((loggedIn) => {
      loggedIn ? this.load() : this.itemsSubject.next([]);
    });
  }

  load(): void {
    if (!this.authService.isUserLoggedIn()) return;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (items) => this.itemsSubject.next(items),
      error: () => this.itemsSubject.next([]),
    });
  }

  has(productId: string): boolean {
    return this.itemsSubject.getValue().some((p) => p._id === productId);
  }

  /** Adds or removes; optimistic so the heart flips instantly */
  toggle(product: any): void {
    if (!this.authService.isUserLoggedIn()) {
      this.toastService.error('Please sign in', 'Sign in to save items to your wishlist.');
      this.router.navigate(['/public/auth']);
      return;
    }
    const current = this.itemsSubject.getValue();
    if (this.has(product._id)) {
      this.itemsSubject.next(current.filter((p) => p._id !== product._id));
      this.http.delete(`${this.apiUrl}/${product._id}`).subscribe({ error: () => this.itemsSubject.next(current) });
    } else {
      this.itemsSubject.next([product, ...current]);
      this.http.post(`${this.apiUrl}/${product._id}`, {}).subscribe({
        next: () => this.toastService.success('Saved', `${product.name} added to your wishlist`),
        error: () => this.itemsSubject.next(current),
      });
    }
  }
}
