import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLoginComponent {
  email = '';
  password = '';

  loading = false;
  errorMsg = '';
  touched: Record<string, boolean> = {};

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

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

    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.errorMsg = 'Email and password are required.';
      return;
    }

    this.loading = true;

    this.auth.loginSystemAdmin({ email, password }).subscribe({
      next: (res: any) => {
        const token = res?.token || res?.accessToken || res?.data?.token;

        if (!token) {
          this.loading = false;
          this.errorMsg = 'No token received.';
          return;
        }

        this.auth.saveToken(token);
        localStorage.setItem('token', token);

        const role =
          res?.admin?.role ||
          res?.user?.role ||
          res?.data?.admin?.role ||
          res?.data?.user?.role ||
          this.auth.getUserFromToken()?.role ||
          'admin';

        localStorage.setItem('role', role);

        this.loading = false;
        this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Admin login failed.';
      }
    });
  }
}
