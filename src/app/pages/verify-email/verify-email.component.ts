import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-verify-email',
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {

  email: string = '';
  otp: string[] = ['', '', '', '', ''];

  loading = false;
  errorMessage = '';
  successMessage = '';

  countdown = 60;
  private timerSub!: Subscription;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.email = localStorage.getItem('signupEmail') || '';

    if (!this.email) {
      this.router.navigate(['/signup'], { replaceUrl: true });
      return;
    }

    this.startTimer();

    setTimeout(() => {
      const firstInput = document.querySelector('.otp-container input') as HTMLElement;
      firstInput?.focus();
    }, 100);
  }

  // ⏱ TIMER
  startTimer() {
    this.countdown = 60;

    this.timerSub = interval(1000).subscribe(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        this.timerSub.unsubscribe();
      }
    });
  }

  // 🔢 INPUT
  handleInput(event: any, index: number) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');

    input.value = value;
    this.otp[index] = value;

    if (value && index < 4) {
      input.nextElementSibling?.focus();
    }

    if (this.otp.join('').length === 5 && !this.loading) {
      this.verify();
    }
  }

  // ⬅️ BACKSPACE
  handleKeyDown(event: any, index: number) {
    if (event.key === 'Backspace') {
      if (this.otp[index]) {
        this.otp[index] = '';
        event.target.value = '';
        return;
      }

      if (index > 0) {
        event.target.previousElementSibling?.focus();
      }
    }
  }

  // ✅ VERIFY
  verify() {
    if (this.loading) return;

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

    this.auth.verifyOtp(this.email, code).subscribe({
      next: (res: any) => {
        this.loading = false;

        const token = res?.token || res?.accessToken;

        if (!token) {
          this.errorMessage = 'Authentication failed ❌';
          return;
        }

        // ✅ save token
        this.auth.saveToken(token);
        localStorage.setItem('token', token);
        localStorage.setItem('allowChooseRole', 'true');

        this.auth.fetchAndStoreCompanyId().subscribe({
          next: () => {
            // 🧹 cleanup
            localStorage.removeItem('signupEmail');

            this.successMessage = 'Verified successfully 🎉';

            // 🚀 🔥 دايمًا choose-role
            setTimeout(() => {
              this.router.navigate(['/choose-role'], { replaceUrl: true });
            }, 1000);
          },
          error: () => {
            localStorage.removeItem('signupEmail');

            this.successMessage = 'Verified successfully 🎉';

            setTimeout(() => {
              this.router.navigate(['/choose-role'], { replaceUrl: true });
            }, 1000);
          }
        });
      },

      error: (err: any) => {
        this.loading = false;

        this.errorMessage =
          err?.error?.message === 'OTP not found'
            ? 'Invalid or expired OTP'
            : err?.error?.message || 'Something went wrong ❌';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
  }
}