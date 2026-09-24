import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth-service.service';
import { environment } from '../../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only our own API gets tokens (never third-party URLs)
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  // Admin pages act as the admin; everything else acts as the shopper
  const isAdminContext = router.url.startsWith('/admin');
  const token = isAdminContext ? authService.getAdminToken() : authService.getUserToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // A rejected token (expired, rotated secret, deleted account) is useless: drop it
      if (token && error.status === 401) {
        if (isAdminContext) {
          authService.clearAdminSession();
          router.navigate(['/admin/auth']);
        } else {
          authService.clearUserSession();
        }
      }
      return throwError(() => error);
    })
  );
};
