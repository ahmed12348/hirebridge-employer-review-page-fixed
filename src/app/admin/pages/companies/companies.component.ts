import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminCompany, AdminJob, AdminMockService } from '../../services/admin-mock.service';

@Component({
  selector: 'app-admin-companies-page',
  imports: [CommonModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCompaniesComponent {
  private readonly router = inject(Router);
  private readonly adminMockService = inject(AdminMockService);
  readonly companies = signal(this.adminMockService.getCompanies());
  readonly jobs = signal(this.adminMockService.getJobs());
  readonly activeCompany = signal<AdminCompany | null>(null);

  readonly activeCompanyJobs = computed<AdminJob[]>(() => {
    const company = this.activeCompany();
    if (!company) {
      return [];
    }

    return this.jobs().filter(job => job.company === company.name);
  });

  readonly totalOpenRoles = computed(() =>
    this.companies().reduce((sum, company) => sum + company.openRoles, 0)
  );
  readonly uniqueIndustries = computed(() => new Set(this.companies().map(c => c.industry)).size);

  openCompanyJobs(company: AdminCompany): void {
    this.activeCompany.set(company);
  }

  closeCompanyJobs(): void {
    this.activeCompany.set(null);
  }

  viewJobDetails(jobId: string): void {
    this.closeCompanyJobs();
    this.router.navigate(['/admin/jobs', jobId]);
  }
}
