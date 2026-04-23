import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AdminCandidate,
  AdminInterview,
  AdminJob,
  AdminMockService
} from '../../services/admin-mock.service';

interface DashboardStat {
  label: string;
  value: number;
  helper: string;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
}

interface ActivityItem {
  title: string;
  detail: string;
  time: string;
  tone: 'blue' | 'green' | 'amber';
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  private readonly router = inject(Router);
  private readonly adminMockService = inject(AdminMockService);

  readonly jobs = signal<AdminJob[]>([]);
  readonly candidates = signal<AdminCandidate[]>([]);
  readonly interviews = signal<AdminInterview[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    this.loadLocalDashboardData();
  }

  readonly featuredJobs = computed(() =>
    [...this.jobs()]
      .sort((a, b) => this.getMatchedCandidatesForJob(b.id) - this.getMatchedCandidatesForJob(a.id))
      .slice(0, 4)
  );

  readonly upcomingInterviews = computed(() =>
    [...this.interviews()]
      .filter(interview => interview.status === 'Scheduled' || interview.status === 'Pending')
      .slice(0, 5)
  );

  readonly activity = computed(() => this.buildActivity(this.jobs(), this.interviews(), this.candidates()));

  readonly interviewsByJob = computed(() => this.buildInterviewsByJob(this.interviews()));

  readonly stats = computed(() => [
    {
      label: 'Active Requests',
      value: this.jobs().length,
      helper: 'Hiring requests currently active in the admin pipeline',
      tone: 'blue'
    },
    {
      label: 'Candidates Sent',
      value: this.candidatesSentCount,
      helper: 'Recommended profiles already shared with the company',
      tone: 'slate'
    },
    {
      label: 'Interviews In Progress',
      value: this.upcomingInterviews().length,
      helper: 'Upcoming or rescheduled interviews being coordinated',
      tone: 'violet'
    },
    {
      label: 'Positions Filled',
      value: this.positionsFilledCount,
      helper: `${this.remainingHeadcount} open slots still not filled`,
      tone: 'green'
    }
  ]);

  get activeRequestsCount(): number {
    return this.jobs().length;
  }

  get candidatesSentCount(): number {
    return this.jobs().reduce(
      (total, job) => total + this.adminMockService.getSentCandidates(job.id).length,
      0
    );
  }

  get positionsFilledCount(): number {
    return this.candidates().filter(candidate => candidate.status === 'Shortlisted').length;
  }

  get remainingHeadcount(): number {
    return Math.max(
      this.jobs().reduce((sum, job) => sum + job.openRoles, 0) - this.positionsFilledCount,
      0
    );
  }

  getPriorityLabel(status: AdminJob['status']): string {
    if (status === 'In Review') {
      return 'in review';
    }

    return status.toLowerCase();
  }

  getPriorityClass(status: AdminJob['status']): string {
    if (status === 'Open') {
      return 'high';
    }

    if (status === 'In Review') {
      return 'medium';
    }

    return 'low';
  }

  getInterviewCountForJob(jobId: string): number {
    return this.interviewsByJob()[jobId] || 0;
  }

  getJobTitle(jobId: string): string {
    return this.jobs().find(job => job.id === jobId)?.title || 'Open role';
  }

  getMatchedCandidatesForJob(jobId: string): number {
    return this.adminMockService.getMatchingCandidates(jobId).length;
  }

  getHiredForJob(jobId: string): number {
    return this.adminMockService.getSentCandidates(jobId).length;
  }

  openJobDetails(jobId: string): void {
    this.router.navigate(['/admin/jobs', jobId]);
  }

  openJobs(): void {
    this.router.navigate(['/admin/jobs']);
  }

  openCandidates(): void {
    this.router.navigate(['/admin/candidates']);
  }

  openInterviews(): void {
    this.router.navigate(['/admin/interviews']);
  }

  private buildActivity(
    jobs: AdminJob[],
    interviews: AdminInterview[],
    candidates: AdminCandidate[]
  ): ActivityItem[] {
    const jobItems = jobs.slice(0, 2).map(job => ({
      title: `${job.title} request is active`,
      detail: `${this.getMatchedCandidatesForJob(job.id)} matched candidates • ${job.openRoles} requested headcount`,
      time: `Requested ${job.requestedAt}`,
      tone: 'blue' as const
    }));

    const interviewItems = interviews.slice(0, 2).map(interview => ({
      title: `${interview.candidateName} interview for ${this.getJobTitle(interview.jobId)}`,
      detail: `${interview.companyName} • ${interview.role}`,
      time: interview.date,
      tone: interview.status === 'Completed' ? ('green' as const) : ('amber' as const)
    }));

    const shortlistedItems = candidates
      .filter(candidate => candidate.status === 'Shortlisted' || candidate.status === 'Interviewing')
      .slice(0, 1)
      .map(candidate => ({
        title: `${candidate.name} moved to ${candidate.status.toLowerCase()}`,
        detail: `${candidate.role} • fit score ${candidate.fitScore || 0}%`,
        time: 'Latest admin update',
        tone: candidate.status === 'Shortlisted' ? ('green' as const) : ('amber' as const)
      }));

    return [...jobItems, ...interviewItems, ...shortlistedItems].slice(0, 5);
  }

  private buildInterviewsByJob(interviews: AdminInterview[]): Record<string, number> {
    return interviews.reduce((accumulator, interview) => {
      accumulator[interview.jobId] = (accumulator[interview.jobId] || 0) + 1;
      return accumulator;
    }, {} as Record<string, number>);
  }

  private loadLocalDashboardData(): void {
    this.jobs.set(this.adminMockService.getJobs());
    this.candidates.set(this.adminMockService.getCandidates());
    this.interviews.set(this.adminMockService.getInterviews());
  }
}
