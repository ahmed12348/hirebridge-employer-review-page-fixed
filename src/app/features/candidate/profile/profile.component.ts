import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize, take, timeout } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { CandidateService } from '../../../core/services/candidate.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  loading = false;
  loadingProfile = false;
  savingProfile = false;
  error: string | null = null;
  successMessage = '';
  user: any;

  constructor(
    private fb: FormBuilder,
    private candidate: CandidateService,
    private auth: AuthService
  ) {
    this.profileForm = this.fb.group({
      specialization: [''],
      experienceLevel: [''],
      expectedSalary: [''],
      workType: ['']
    });
  }

  ngOnInit(): void {
    this.user = this.auth.getUserFromToken();
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.loadingProfile = true;
    this.error = null;
    this.successMessage = '';

    this.candidate.getCandidateProfile()
      .pipe(
        take(1),
        timeout(8000),
        finalize(() => {
          this.loading = false;
          this.loadingProfile = false;
        })
      )
      .subscribe({
        next: (res: any) => {
          const user = this.extractResponseUser(res);
          const candidateProfile = user?.candidateProfile || res?.candidateProfile || null;

          if (user) {
            this.user = {
              ...this.user,
              name: this.extractUserName(user),
              email: user?.email || this.user?.email
            };
          }

          this.profileForm.patchValue({
            specialization: candidateProfile?.specialization || '',
            experienceLevel: candidateProfile?.experienceLevel || '',
            expectedSalary: candidateProfile?.expectedSalary || '',
            workType: candidateProfile?.workType || ''
          });
        },
        error: (err: any) => {
          this.error = this.buildApiErrorMessage(err, 'load');
        }
      });
  }

  submit(): void {
    if (this.savingProfile) {
      return;
    }

    this.loading = true;
    this.savingProfile = true;
    this.error = null;
    this.successMessage = '';

    const form = this.profileForm.getRawValue();
    const body = {
      candidateProfile: {
        specialization: form.specialization || '',
        experienceLevel: form.experienceLevel || '',
        expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : 0,
        workType: form.workType || '',
        skills: ['angular']
      }
    };

    this.candidate.updateCandidateProfile(body)
      .pipe(
        take(1),
        timeout(10000),
        finalize(() => {
          this.loading = false;
          this.savingProfile = false;
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Profile updated successfully.';
        },
        error: (err: any) => {
          this.error = this.buildApiErrorMessage(err, 'save');
        }
      });
  }

  private buildApiErrorMessage(err: any, action: 'load' | 'save'): string {
    if (err?.name === 'TimeoutError') {
      return action === 'load'
        ? 'Loading profile took too long. Please try again.'
        : 'Saving profile took too long. Please try again.';
    }

    const httpError = err as HttpErrorResponse;
    const actionLabel = action === 'load' ? 'load' : 'save';

    if (httpError.status === 401) {
      return this.auth.getToken()
        ? `API returned 401 Unauthorized while trying to ${actionLabel} your profile. Your token may be expired. Please log in again.`
        : `API returned 401 Unauthorized while trying to ${actionLabel} your profile. No auth token was found, so please log in first.`;
    }

    if (httpError.status === 403) {
      return `API returned 403 Forbidden while trying to ${actionLabel} your profile. Your account may not have permission for this action.`;
    }

    if (httpError.status === 0) {
      return `Could not reach the API while trying to ${actionLabel} your profile. Check that the backend is running on http://localhost:3004 and that CORS is enabled.`;
    }

    return httpError?.error?.message || `Failed to ${actionLabel} profile. Please try again.`;
  }

  private extractResponseUser(res: any): any {
    return res?.data?.user || res?.data || res?.user || res?.userDetails || res;
  }

  private extractUserName(user: any): string {
    return (
      user?.name ||
      user?.firstName ||
      user?.fullName ||
      user?.username ||
      user?.email?.split('@')[0] ||
      this.user?.name ||
      'User'
    );
  }
}
