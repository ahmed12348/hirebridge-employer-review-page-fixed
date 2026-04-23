import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnDestroy {
  email = '';
  password = '';

  loading = false;
  errorMsg = '';
  touched: Record<string, boolean> = {};
  private brandMarkTapCount = 0;
  private brandMarkTapTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    if (this.brandMarkTapTimer) {
      clearTimeout(this.brandMarkTapTimer);
      this.brandMarkTapTimer = null;
    }
  }

  onBrandMarkClick(): void {
    this.brandMarkTapCount += 1;

    if (this.brandMarkTapTimer) {
      clearTimeout(this.brandMarkTapTimer);
    }

    this.brandMarkTapTimer = setTimeout(() => {
      this.brandMarkTapCount = 0;
      this.brandMarkTapTimer = null;
    }, 1000);

    if (this.brandMarkTapCount === 3) {
      this.brandMarkTapCount = 0;
      if (this.brandMarkTapTimer) {
        clearTimeout(this.brandMarkTapTimer);
        this.brandMarkTapTimer = null;
      }
      this.router.navigate(['/admin-login']);
    }
  }

  isEmpty(value: string): boolean {
    return !value || value.trim() === '';
  }

  onBlur(field: string): void {
    this.touched[field] = true;
  }

  isValid(): boolean {
    return !this.isEmpty(this.email) && !this.isEmpty(this.password);
  }

  submit(): void {
    this.errorMsg = '';

    if (!this.isValid()) {
      this.touched = { email: true, password: true };
      return;
    }

    this.loading = true;

    this.auth.login({
      email: this.email,
      password: this.password
    }).subscribe({

      next: (res: any) => {
        // ✅ TOKEN
        const token = res?.token || res?.accessToken || res?.data?.token;

        if (!token) {
          this.loading = false;
          this.errorMsg = 'No token received.';
          return;
        }

        this.auth.saveToken(token);
        localStorage.setItem('token', token);

        const role =
          res?.user?.role ||
          res?.data?.user?.role ||
          this.auth.getUserFromToken()?.role ||
          'candidate';
        localStorage.setItem('role', role);

        this.auth.fetchAndStoreCompanyId().subscribe({
          next: () => {
            this.loading = false;

            if (role === 'employer') {
              this.router.navigate(['/employer/dashboard'], { replaceUrl: true });
              return;
            }

            this.router.navigate(['/dashboard'], { replaceUrl: true });
          },
          error: () => {
            this.loading = false;

            if (role === 'employer') {
              this.router.navigate(['/employer/dashboard'], { replaceUrl: true });
              return;
            }

            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        });
      },

      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Login failed.';
      }
    });
  }
}