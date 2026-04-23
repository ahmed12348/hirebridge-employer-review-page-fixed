import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminJob, AdminMockService } from '../../services/admin-mock.service';

@Component({
  selector: 'app-admin-job-details-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminJobDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminMockService = inject(AdminMockService);

  readonly jobId = signal(this.route.snapshot.paramMap.get('id') || '');
  readonly job = computed<AdminJob | null>(() => this.adminMockService.getJobById(this.jobId()));
  readonly sentCandidates = computed(() => this.adminMockService.getSentCandidates(this.jobId()));
  readonly progress = computed(() => {
    const currentJob = this.job();
    if (!currentJob || !currentJob.openRoles) {
      return 0;
    }

    return Math.min(100, Math.round((this.sentCandidates().length / currentJob.openRoles) * 100));
  });

  searchMatchingCandidates(): void {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }

    this.router.navigate(['/admin/candidates'], { queryParams: { jobId: currentJob.id } });
  }

  openInterviews(): void {
    this.router.navigate(['/admin/interviews']);
  }
}
