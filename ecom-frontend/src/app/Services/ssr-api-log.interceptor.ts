import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { catchError, throwError, timeout } from 'rxjs';

/** A render waits for its API calls; past this the page is sent without that data */
const SERVER_API_TIMEOUT_MS = 5000;

/**
 * Server-rendering only: caps how long a page waits on the API and logs failures to the host's
 * logs (pages still render, just without that data, so failures are otherwise invisible).
 */
export const ssrApiLogInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) return next(req);
  const started = Date.now();
  return next(req).pipe(
    timeout(SERVER_API_TIMEOUT_MS),
    catchError((error) => {
      const detail =
        error instanceof HttpErrorResponse ? `${error.status} ${error.message}` : `${error?.name || 'Error'}: ${error?.message || error}`;
      console.error(`[ssr] API request failed after ${Date.now() - started}ms: ${req.method} ${req.urlWithParams} -> ${detail}`);
      return throwError(() => error);
    })
  );
};
