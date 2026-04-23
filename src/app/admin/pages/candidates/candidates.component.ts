import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminMockService } from '../../services/admin-mock.service';
import { AdminCandidate, AdminJob } from '../../services/admin-mock.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-candidates-page',
  imports: [CommonModule],
  templateUrl: './candidates.component.html',
  styleUrl: './candidates.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCandidatesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminMockService = inject(AdminMockService);
  private readonly toastService = inject(ToastService);

  readonly selectedCandidate = signal<AdminCandidate | null>(null);
  readonly currentJobId = signal(this.route.snapshot.queryParamMap.get('jobId') || '');
  readonly currentJob = signal<AdminJob | null>(
    this.currentJobId() ? this.adminMockService.getJobById(this.currentJobId()) : null
  );

  readonly candidates = computed(() =>
    this.currentJobId()
      ? this.adminMockService.getMatchingCandidates(this.currentJobId())
      : this.adminMockService.getCandidates()
  );

  readonly isMatchingMode = computed(() => !!this.currentJobId());
  readonly averageFitScore = computed(() => {
    const list = this.candidates();
    if (!list.length) {
      return 0;
    }

    const total = list.reduce((sum, candidate) => sum + candidate.fitScore, 0);
    return Math.round(total / list.length);
  });
  readonly sentForCurrentJob = computed(() => {
    const jobId = this.currentJobId();
    if (!jobId) {
      return 0;
    }

    return this.adminMockService.getSentCandidates(jobId).length;
  });
  readonly sentCandidateIds = computed(() => {
    const jobId = this.currentJobId();
    if (!jobId) {
      return new Set<string>();
    }

    return new Set(this.adminMockService.getSentCandidates(jobId).map(candidate => candidate.id));
  });

  isSent(candidateId: string): boolean {
    return this.sentCandidateIds().has(candidateId);
  }

  openCv(candidate: AdminCandidate): void {
    this.selectedCandidate.set(candidate);
  }

  closeCv(): void {
    this.selectedCandidate.set(null);
  }

  openSentList(): void {
    const jobId = this.currentJobId();
    if (!jobId) {
      return;
    }

    this.router.navigate(['/admin/jobs', jobId]);
  }

  sendCandidate(candidate: AdminCandidate): void {
    const jobId = this.currentJobId();
    if (!jobId) {
      this.toastService.error('No job selected for sending');
      return;
    }

    const result = this.adminMockService.sendCandidate(jobId, candidate.id);

    if (result === 'sent') {
      this.toastService.success(`${candidate.name} sent successfully`);
      return;
    }

    if (result === 'already-sent') {
      this.toastService.info(`${candidate.name} is already sent`);
      return;
    }

    this.toastService.error('Unable to send candidate, please try again');
  }

  cancelCandidate(candidate: AdminCandidate): void {
    const jobId = this.currentJobId();
    if (!jobId) {
      this.toastService.error('No job selected');
      return;
    }

    const result = this.adminMockService.revokeCandidate(jobId, candidate.id);
    if (result === 'revoked') {
      this.toastService.info(`${candidate.name} was removed from sent list`);
      return;
    }

    this.toastService.error('Candidate was not in sent list');
  }
}
