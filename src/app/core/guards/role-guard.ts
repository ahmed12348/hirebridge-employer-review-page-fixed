import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const RoleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const expectedRole = route.data?.['role'];

  if (!expectedRole) {
    return true;
  }

  const user = auth.getUserFromToken();
  const userRole = auth.getRole();
  const allowChooseRole = localStorage.getItem('allowChooseRole') === 'true';

  if (!user) {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  if (userRole !== expectedRole) {
    if (allowChooseRole) {
      router.navigate(['/choose-role'], { replaceUrl: true });
    } else {
      router.navigate(['/login'], { replaceUrl: true });
    }
    return false;
  }

  return true;
};
