import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth-service.service';

@Injectable({
  providedIn: 'root',
})
export class RedirectGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAdminLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
      return false;
    } else if (this.authService.isUserLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    } else {
      return true; // Allow access to login page
    }
  }
}
