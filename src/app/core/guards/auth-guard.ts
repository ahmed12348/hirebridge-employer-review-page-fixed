import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const user = authService.getUserFromToken();

  if (!token || !user) {
    authService.logout();
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  return true;
};