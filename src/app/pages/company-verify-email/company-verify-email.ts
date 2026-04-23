import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import { CompanyService } from '../../core/services/company.service';

@Component({
  standalone: true,
  selector: 'app-company-verify-email',
  imports: [CommonModule, FormsModule],
  templateUrl: './company-verify-email.html',
  styleUrl: './company-verify-email.css'
})
export class CompanyVerifyEmailComponent implements OnInit, OnDestroy {
  email = '';
  otp: string[] = ['', '', '', '', ''];

  loading = false;
  errorMessage = '';
  successMessage = '';
  countdown = 60;
  private timerSub!: Subscription;

  constructor(
    private router: Router,
    private company: CompanyService
  ) {}

  ngOnInit(): void {
    this.email = localStorage.getItem('companyEmail') || '';

    if (!this.email) {
      this.router.navigate(['/company-setup'], { replaceUrl: true });
      return;
    }

    this.startTimer();

    setTimeout(() => {
      const firstInput = document.querySelector('.otp-container input') as HTMLElement | null;
      firstInput?.focus();
    }, 100);
  }

  startTimer(): void {
    this.countdown = 60;

    this.timerSub = interval(1000).subscribe(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        this.timerSub.unsubscribe();
      }
    });
  }

  handleInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    input.value = value;
    this.otp[index] = value;

    if (value && index < 4) {
      (input.nextElementSibling as HTMLElement | null)?.focus();
    }

    if (this.otp.join('').length === 5 && !this.loading) {
      this.verify();
    }
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (this.otp[index]) {
        this.otp[index] = '';
        input.value = '';
        return;
      }

      if (index > 0) {
        (input.previousElementSibling as HTMLElement | null)?.focus();
      }
    }
  }

  verify(): void {
    if (this.loading) {
      return;
    }

    const code = this.otp.join('');

    if (!this.email) {
      this.errorMessage = 'Email is required';
      return;
    }

    if (code.length !== 5) {
      this.errorMessage = 'Enter full OTP';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.company.verifyCompanyOtp(this.email, code).subscribe({
      next: () => {
        this.loading = false;
        localStorage.removeItem('companyEmail');
        localStorage.setItem('role', 'employer');
        this.successMessage = 'Company verified successfully.';

        setTimeout(() => {
          this.router.navigate(['/employer/dashboard'], { replaceUrl: true });
        }, 1000);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message === 'OTP not found'
            ? 'Invalid or expired OTP'
            : err?.error?.message || 'Something went wrong.';
      }
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }
}
