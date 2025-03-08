import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth-service.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Check if it's an admin or user request (Modify this logic based on your API structure)
  const isAdminRequest = req.url.includes('/admin'); // Example: API paths with "/admin"
  
  const token = isAdminRequest ? authService.getAdminToken() : authService.getUserToken();

  // Clone request with token if available
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq);
};
