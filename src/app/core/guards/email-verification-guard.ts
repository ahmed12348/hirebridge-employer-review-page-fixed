import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const emailVerificationGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const isEmailVerified = localStorage.getItem('allowChooseRole') === 'true';
  const user = authService.getUserFromToken();

  if (!isEmailVerified) {
    // Get the role to determine which verify page to redirect to
    const role = user?.role || localStorage.getItem('role');

    if (role === 'employer') {
      router.navigate(['/company-verify-email'], { replaceUrl: true });
    } else {
      router.navigate(['/verify-email'], { replaceUrl: true });
    }

    return false;
  }

  return true;
};
