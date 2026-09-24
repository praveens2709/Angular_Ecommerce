import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service.service';

/** Checkout pages need a logged-in user (the cart lives on the server per user) */
export const userAuthGuard: CanActivateFn = () => {
  // The server can't see the login (it lives in the browser); let the browser decide
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  if (inject(AuthService).isUserLoggedIn()) return true;
  return inject(Router).createUrlTree(['/public/auth']);
};
