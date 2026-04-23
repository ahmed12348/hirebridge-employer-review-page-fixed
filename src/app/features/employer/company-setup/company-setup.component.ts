import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { CompanyService } from '../../../core/services/company.service';

@Component({
  standalone: true,
  selector: 'app-company-setup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './company-setup.component.html',
  styleUrls: ['./company-setup.component.css']
})
export class CompanySetupComponent {
  name = '';
  CompanyEmail = '';
  industry = '';
  size: number | null = null;
  budgetRange: number | null = null;
  website = '';
  logo = '';

  loading = false;
  success = false;
  submitted = false;
  errorMsg = '';

  constructor(
    private company: CompanyService,
    private router: Router
  ) {}

  isEmpty(value: any): boolean {
    return value === null || value === undefined || value.toString().trim() === '';
  }

  isValid(): boolean {
    return !(
      this.isEmpty(this.name) ||
      this.isEmpty(this.CompanyEmail) ||
      this.isEmpty(this.industry) ||
      this.isEmpty(this.size) ||
      this.isEmpty(this.budgetRange) ||
      this.isEmpty(this.website) ||
      this.isEmpty(this.logo)
    );
  }

  submit(): void {
    this.submitted = true;
    this.errorMsg = '';

    if (!this.isValid()) {
      this.errorMsg = 'Please fill all fields';
      return;
    }

    const payload = {
      name: this.name,
      CompanyEmail: this.CompanyEmail.toLowerCase(),
      industry: this.industry,
      website: this.website,
      logo: this.logo || 'https://test.com/logo.png',
      role: 'employer',
      employerProfile: {
        EmployerCompanyName: this.name,
        companySize: this.size,
        budgetRange: this.budgetRange
      }
    };

    this.loading = true;

    this.company.createCompanyProfile(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.success = true;

        const companyId =
          res?.company?._id ||
          res?.company?.id ||
          res?.data?.company?._id ||
          res?.data?.company?.id ||
          res?.companyId ||
          res?.data?.companyId ||
          null;

        if (companyId) {
          localStorage.setItem('companyId', companyId);
        }

        localStorage.setItem('companyEmail', this.CompanyEmail);
        setTimeout(() => {
          this.router.navigate(['/company-verify-email'], { replaceUrl: true });
        }, 800);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Something went wrong.';
      }
    });
  }
}
