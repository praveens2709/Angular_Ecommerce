import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth-service.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAdminLoggedIn$.pipe(
      map((isAdminLoggedIn) => {
        if (isAdminLoggedIn) {
          return true;
        } else {
          this.router.navigate(['/admin/auth']);
          return false;
        }
      })
    );
  }
}
