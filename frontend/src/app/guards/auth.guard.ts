import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const authGuard: CanActivateFn = async (route) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);

  const isLoggedIn = keycloak.isLoggedIn();

  if (!isLoggedIn) {
    await keycloak.login({ redirectUri: window.location.origin + route.url.join('/') });
    return false;
  }

  const requiredRoles: string[] = route.data['roles'] ?? [];
  if (requiredRoles.length === 0) {
    return true;
  }

  const hasRole = requiredRoles.some((role) => keycloak.isUserInRole(role));
  if (!hasRole) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
