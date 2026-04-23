import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignupComponent {

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';

  loading = false;
  errorMsg = '';

  touched: any = {};

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  isEmpty(value: string) {
    return !value || value.trim() === '';
  }

  onBlur(field: string) {
    this.touched[field] = true;
  }

  markAllTouched() {
    this.touched = {
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      phone: true
    };
  }

  isValid(): boolean {
    return !(
      this.isEmpty(this.name) ||
      this.isEmpty(this.email) ||
      this.isEmpty(this.password) ||
      this.isEmpty(this.confirmPassword) ||
      this.isEmpty(this.phone) ||
      this.password.length < 6 ||
      this.password !== this.confirmPassword
    );
  }

  submit() {

    this.errorMsg = '';

    if (!this.isValid()) {
      this.markAllTouched();
      return;
    }

    const fullName = this.name.trim().split(' ');

    const data = {
      email: this.email,
      password: this.password,
      firstName: fullName[0],
      LastName: fullName.slice(1).join(' ') || '',
      PhoneNumber: this.phone
    };

    this.loading = true;

    this.auth.register(data).subscribe({

      next: (res: any) => {
        this.loading = false;

        // ❌ مهم جدًا: متحفظش token هنا

        // 🔥 خزّن الإيميل بس
        localStorage.setItem('signupEmail', this.email);

        setTimeout(() => {
          this.router.navigate(['/verify-email']);
        }, 500);
      },

      error: (err: any) => {
        this.loading = false;

        this.errorMsg =
          err?.error?.message || 'Signup failed ❌';
      }
    });
  }
}