import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  EmployerJobsService,
  EmployerCreateJobApiPayload
} from '../../../core/services/employer-jobs.service';
import { AdminMockService } from '../../../admin/services/admin-mock.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  selector: 'app-employer-create-job-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-job-page.component.html',
  styleUrls: ['./create-job-page.component.css']
})
export class EmployerCreateJobPageComponent {
  saving = false;
  error = '';
  skillInput = '';
  form: EmployerCreateJobApiPayload = {
    title: '',
    category: '',
    description: '',
    skillsRequired: [],
    experienceLevel: 'Mid',
    minExperience: 3,
    budget: {
      min: 0,
      max: 0
    },
    workType: 'Remote'
  };

  constructor(
    private jobsService: EmployerJobsService,
    private router: Router,
    private adminMockService: AdminMockService,
    private toastService: ToastService
  ) {}

  addSkill(): void {
    const value = this.skillInput.trim();

    if (!value) {
      return;
    }

    if (!this.form.skillsRequired.includes(value)) {
      this.form.skillsRequired = [...this.form.skillsRequired, value];
    }

    this.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.form.skillsRequired = this.form.skillsRequired.filter(item => item !== skill);
  }

  submit(): void {
    this.error = '';

    if (!this.form.title.trim() || !this.form.category.trim() || !this.form.description.trim()) {
      this.error = 'Please complete the job title, category, and description.';
      return;
    }

    const minExperience = Number(this.form.minExperience);
    if (!Number.isFinite(minExperience) || minExperience < 0) {
      this.error = 'Please provide the minimum years of experience.';
      return;
    }

    const minBudget = Number(this.form.budget.min);
    const maxBudget = Number(this.form.budget.max);

    if (!Number.isFinite(minBudget) || minBudget <= 0) {
      this.error = 'Budget minimum must be greater than 0.';
      return;
    }

    if (!Number.isFinite(maxBudget) || maxBudget < minBudget) {
      this.error = 'Budget maximum must be greater than or equal to minimum.';
      return;
    }

    if (!this.form.skillsRequired.length) {
      this.error = 'Add at least one required skill.';
      return;
    }

    const payload: EmployerCreateJobApiPayload = {
      title: this.form.title.trim(),
      category: this.form.category.trim(),
      description: this.form.description.trim(),
      skillsRequired: this.form.skillsRequired,
      experienceLevel: this.form.experienceLevel,
      minExperience,
      budget: {
        min: minBudget,
        max: maxBudget
      },
      workType: this.form.workType
    };

    this.saving = true;

    this.jobsService.createJobForCurrentCompany(payload).subscribe({
      next: job => {
        this.adminMockService.addJobFromEmployer({
          id: job.id,
          title: job.title,
          location: job.location,
          workType: job.type,
          budget: job.salary,
          openRoles: job.openRoles,
          minExperience: job.minExperience,
          skills: job.skillsRequired
        });

        this.saving = false;
        this.toastService.success('Hiring request created successfully.');
        this.router.navigate(['/employer/jobs']);
      },
      error: (err: unknown) => {
        this.saving = false;

        if (err instanceof HttpErrorResponse) {
          if (err.status === 401 || err.status === 403) {
            this.error = 'Unauthorized';
            return;
          }

          if (err.status === 404) {
            this.error = 'Company not found';
            return;
          }
        }

        const message = String((err as { message?: string })?.message || '').toLowerCase();

        if (message.includes('company not found')) {
          this.error = 'Company not found';
          return;
        }

        if (message.includes('unauthorized')) {
          this.error = 'Unauthorized';
          return;
        }

        this.error = 'Unable to create hiring request right now.';
      }
    });
  }
}
