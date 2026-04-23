import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminMockService } from '../../services/admin-mock.service';
import { AdminJob } from '../../services/admin-mock.service';

@Component({
  selector: 'app-admin-jobs-page',
  imports: [CommonModule],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobsComponent {
  private readonly router = inject(Router);
  private readonly adminMockService = inject(AdminMockService);

  readonly jobs = signal(this.adminMockService.getUpcomingJobs());
  readonly openJobsCount = computed(() => this.jobs().filter(job => job.status === 'Open').length);
  readonly reviewJobsCount = computed(() => this.jobs().filter(job => job.status === 'In Review').length);

  openDetails(job: AdminJob): void {
    this.router.navigate(['/admin/jobs', job.id]);
  }
}
