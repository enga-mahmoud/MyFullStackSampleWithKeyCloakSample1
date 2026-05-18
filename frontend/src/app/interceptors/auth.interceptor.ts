import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);

  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  return from(keycloak.getToken()).pipe(
    switchMap((token) => {
      if (token) {
        req = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });
      }
      return next(req);
    }),
    catchError((error) => {
      // 401 from the API means the token was rejected (expired or invalid).
      // A non-HttpErrorResponse means keycloak.getToken() itself failed
      // (both access and refresh tokens are expired).
      // In either case, force a fresh login and restore the current URL afterward.
      if (!(error instanceof HttpErrorResponse) || error.status === 401) {
        keycloak.login({ redirectUri: window.location.href });
      }
      return throwError(() => error);
    })
  );
};
