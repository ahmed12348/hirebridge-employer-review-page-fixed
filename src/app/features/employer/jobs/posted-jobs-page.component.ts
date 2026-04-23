import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { switchMap, distinctUntilChanged } from 'rxjs/operators';

import {
  EmployerApplicant,
  EmployerApplicationsService
} from '../../../core/services/employer-applications.service';
import { InterviewSchedulingService } from '../../../core/services/interview-scheduling.service';
import { EmployerJob, EmployerJobsService } from '../../../core/services/employer-jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { InterviewStatus } from '../../../shared/enums/interview-status.enum';
import { WorkType } from '../../../shared/enums/work-type.enum';
import { ScheduledInterview } from '../../../shared/models/interview.model';

@Component({
  standalone: true,
  selector: 'app-employer-posted-jobs-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './posted-jobs-page.component.html',
  styleUrls: ['./posted-jobs-page.component.css']
})
export class EmployerPostedJobsPageComponent implements OnInit {
  private readonly baseUrl = 'http://localhost:3004';
  loading = false;
  error = '';
  jobs: EmployerJob[] = [];
  applicants: EmployerApplicant[] = [];
  interviewCounts: Record<string, number> = {};
  upcomingInterviewCounts: Record<string, number> = {};
  selectedJob: EmployerJob | null = null;
  selectedJobApplicants: EmployerApplicant[] = [];
  selectedJobInterviews: ScheduledInterview[] = [];
  detailsLoading = false;
  detailsError = '';
  candidatePreviewJob: EmployerJob | null = null;
  candidatePreviewApplicants: EmployerApplicant[] = [];
  candidatePreviewLoading = false;
  candidatePreviewError = '';
  candidatePreviewIndex = 0;
  candidateActionLoading = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private jobsService: EmployerJobsService,
    private interviewSchedulingService: InterviewSchedulingService,
    private employerApplicationsService: EmployerApplicationsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  get totalInterviews(): number {
    return Object.values(this.interviewCounts).reduce((sum, count) => sum + count, 0);
  }

  get upcomingInterviews(): number {
    return Object.values(this.upcomingInterviewCounts).reduce((sum, count) => sum + count, 0);
  }

  get totalBudget(): number {
    return this.jobs.reduce((sum, job) => sum + job.salary, 0);
  }

  get totalHeadcount(): number {
    return this.jobs.reduce((sum, job) => sum + job.openRoles, 0);
  }

  loadJobs(): void {
    this.loading = true;
    this.error = '';

    this.jobsService
      .getOrFetchCompanyId()
      .pipe(
        switchMap(() =>
          combineLatest([
            this.jobsService.getCompanyJobs(),
            this.interviewSchedulingService.getAllInterviews(),
            this.employerApplicationsService.getAllApplicants()
          ])
        ),
        distinctUntilChanged()
      )
      .subscribe({
        next: ([jobs, interviews, applicants]) => {
          this.loading = false;
          if (jobs && jobs.length > 0) {
            this.jobs = this.normalizeJobsResponse(jobs);
          }
          if (applicants) {
            this.applicants = applicants;
          }
          if (interviews) {
            this.interviewCounts = interviews.reduce((acc: Record<string, number>, interview: ScheduledInterview) => {
              acc[interview.jobId] = (acc[interview.jobId] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            this.upcomingInterviewCounts = interviews
              .filter(
                (interview: ScheduledInterview) =>
                  interview.status === InterviewStatus.Scheduled ||
                  interview.status === InterviewStatus.Rescheduled
              )
              .reduce((acc: Record<string, number>, interview: ScheduledInterview) => {
                acc[interview.jobId] = (acc[interview.jobId] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
          }
        },
        error: err => {
          this.loading = false;
          const message = String((err as { message?: string })?.message || '');

          if (message.toLowerCase().includes('unauthorized')) {
            this.error = 'Unauthorized';
            return;
          }

          this.error = 'Unable to load jobs.';
        }
      });
  }

  deleteJob(job: EmployerJob): void {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';

    if (!token) {
      this.toastService.error('Unauthorized');
      return;
    }

    this.http.delete(
      `${this.baseUrl}/job/delete-job/${job.id}`,
      {
        headers: {
          auth: token
        }
      }
    ).subscribe({
      next: () => {
        this.toastService.info(`Deleted "${job.title}".`);
        this.loadJobs();
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          this.toastService.error('Unauthorized');
          return;
        }

        this.toastService.error('Unable to delete job.');
      }
    });
  }

  getInterviewCount(jobId: string): number {
    return this.interviewCounts[jobId] || 0;
  }

  getUpcomingInterviewCount(jobId: string): number {
    return this.upcomingInterviewCounts[jobId] || 0;
  }

  getMatchedCount(jobId: string): number {
    return this.applicants.filter(applicant => applicant.jobId === jobId).length;
  }

  getShortlistedCount(jobId: string): number {
    return this.applicants.filter(
      applicant => applicant.jobId === jobId && applicant.shortlistStage !== 'recommended'
    ).length;
  }

  getAcceptedForInterviewCount(jobId: string): number {
    return this.applicants.filter(
      applicant =>
        applicant.jobId === jobId &&
        (applicant.companyDecision === 'accepted_for_interview' || applicant.companyDecision === 'hired')
    ).length;
  }

  getHiredCount(jobId: string): number {
    return this.applicants.filter(
      applicant => applicant.jobId === jobId && applicant.companyDecision === 'hired'
    ).length;
  }

  getRemainingCount(job: EmployerJob): number {
    return Math.max(job.openRoles - this.getHiredCount(job.id), 0);
  }

  getEmploymentTypeLabel(type: string | undefined): string {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized.includes('part')) return 'Part Time';
    if (normalized.includes('remote')) return 'Remote';
    if (normalized.includes('hybrid')) return 'Hybrid';
    if (normalized.includes('on')) return 'Onsite';
    return 'Full Time';
  }

  openJobDetails(jobId: string): void {
    this.detailsLoading = true;
    this.detailsError = '';
    this.selectedJob = this.jobs.find(job => job.id === jobId) || null;
    this.selectedJobApplicants = [];
    this.selectedJobInterviews = [];

    combineLatest([
      this.jobsService.getJobById(jobId),
      this.interviewSchedulingService.getInterviewsByJob(jobId),
      this.employerApplicationsService.getApplicantsByJob(jobId)
    ]).subscribe({
      next: ([job, interviews, applicants]) => {
        if (job) {
          this.selectedJob = job;
          this.selectedJobInterviews = this.sortInterviews(interviews);
          this.selectedJobApplicants = this.sortApplicants(applicants);
        }
        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.detailsError = 'Unable to load request details.';
      }
    });
  }

  openReviewCandidates(jobId: string): void {
    const currentJob = this.jobs.find(job => job.id === jobId) || null;
    this.candidatePreviewJob = currentJob;
    this.candidatePreviewApplicants = [];
    this.candidatePreviewIndex = 0;
    this.candidatePreviewError = '';
    this.candidatePreviewLoading = true;
    this.candidateActionLoading = false;

    this.employerApplicationsService.getApplicantsByJob(jobId).subscribe({
      next: applicants => {
        const sentApplicants = applicants.filter(applicant => applicant.shortlistStage !== 'recommended');
        this.candidatePreviewApplicants = this.sortApplicants(sentApplicants.length ? sentApplicants : applicants);
        this.candidatePreviewLoading = false;
      },
      error: () => {
        this.candidatePreviewLoading = false;
        this.candidatePreviewError = 'Unable to load candidates for this request.';
      }
    });
  }

  closeJobDetails(): void {
    this.selectedJob = null;
    this.selectedJobApplicants = [];
    this.selectedJobInterviews = [];
    this.detailsLoading = false;
    this.detailsError = '';
  }

  get selectedSentCandidatesCount(): number {
    return this.selectedJobApplicants.filter(applicant => applicant.shortlistStage !== 'recommended').length;
  }

  get selectedHiredCandidatesCount(): number {
    return this.selectedJobApplicants.filter(applicant => applicant.companyDecision === 'hired').length;
  }

  get selectedUpcomingInterviewsCount(): number {
    return this.selectedJobInterviews.filter(
      interview =>
        interview.status === InterviewStatus.Scheduled ||
        interview.status === InterviewStatus.Rescheduled
    ).length;
  }

  get selectedAverageFitScore(): number {
    if (!this.selectedJobApplicants.length) return 0;
    const total = this.selectedJobApplicants.reduce((sum, applicant) => sum + (applicant.fitScore || 0), 0);
    return Math.round(total / this.selectedJobApplicants.length);
  }

  get selectedRemainingHeadcount(): number {
    if (!this.selectedJob) return 0;
    return Math.max(this.selectedJob.openRoles - this.selectedHiredCandidatesCount, 0);
  }

  get selectedProgressPercent(): number {
    if (!this.selectedJob?.openRoles) return 0;
    return Math.min(100, Math.round((this.selectedHiredCandidatesCount / this.selectedJob.openRoles) * 100));
  }

  getCompanyDecisionLabel(applicant: EmployerApplicant): string {
    const labels: Record<string, string> = {
      pending: 'Pending company feedback',
      accepted_for_interview: 'Accepted for interview',
      rejected: 'Rejected by company',
      request_replacement: 'Replacement requested',
      hired: 'Hired'
    };

    return labels[applicant.companyDecision || 'pending'] || 'Pending company feedback';
  }

  getSalaryMatchLabel(match: EmployerApplicant['salaryMatch']): string {
    const labels: Record<EmployerApplicant['salaryMatch'], string> = {
      within_budget: 'Within budget',
      slightly_above: 'Slightly above budget',
      out_of_budget: 'Out of budget'
    };

    return labels[match];
  }

  getInterviewStatusLabel(status: InterviewStatus): string {
    return status.replace(/_/g, ' ');
  }

  trackModalBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeJobDetails();
    }
  }

  trackCandidatePreviewBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCandidatePreview();
    }
  }

  closeCandidatePreview(): void {
    this.candidatePreviewJob = null;
    this.candidatePreviewApplicants = [];
    this.candidatePreviewLoading = false;
    this.candidatePreviewError = '';
    this.candidatePreviewIndex = 0;
    this.candidateActionLoading = false;
  }

  get previewedCandidate(): EmployerApplicant | null {
    return this.candidatePreviewApplicants[this.candidatePreviewIndex] || null;
  }

  get hasNextPreviewCandidate(): boolean {
    return this.candidatePreviewIndex < this.candidatePreviewApplicants.length - 1;
  }

  get hasPreviousPreviewCandidate(): boolean {
    return this.candidatePreviewIndex > 0;
  }

  showPreviousCandidate(): void {
    if (this.hasPreviousPreviewCandidate) {
      this.candidatePreviewIndex -= 1;
    }
  }

  showNextCandidate(): void {
    if (this.hasNextPreviewCandidate) {
      this.candidatePreviewIndex += 1;
    }
  }

  acceptPreviewCandidate(): void {
    this.submitPreviewDecision('accepted_for_interview', 'accepted');
  }

  rejectPreviewCandidate(): void {
    this.submitPreviewDecision('rejected', 'rejected');
  }

  openFullReviewFromPreview(): void {
    if (!this.candidatePreviewJob) return;

    const candidateId = this.previewedCandidate?.id;
    this.router.navigate(['/employer/jobs', this.candidatePreviewJob.id, 'review-candidates'], {
      queryParams: {
        candidateId: candidateId || null
      }
    });
    this.closeCandidatePreview();
  }

  private sortApplicants(applicants: EmployerApplicant[]): EmployerApplicant[] {
    return [...applicants].sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
  }

  private sortInterviews(interviews: ScheduledInterview[]): ScheduledInterview[] {
    return [...interviews].sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
    );
  }

  private submitPreviewDecision(
    decision: NonNullable<EmployerApplicant['companyDecision']>,
    tab: 'accepted' | 'rejected'
  ): void {
    const candidate = this.previewedCandidate;

    if (!candidate || !this.candidatePreviewJob || this.candidateActionLoading) return;

    this.candidateActionLoading = true;
    this.candidatePreviewError = '';

    this.employerApplicationsService.updateCompanyDecision(candidate.id, decision).subscribe({
      next: updated => {
        this.applicants = this.sortApplicants(
          this.applicants.map(item => (item.id === updated.id ? updated : item))
        );
        this.candidatePreviewApplicants = this.sortApplicants(
          this.candidatePreviewApplicants.map(item => (item.id === updated.id ? updated : item))
        );

        this.router.navigate(['/employer/jobs', this.candidatePreviewJob!.id, 'review-candidates'], {
          queryParams: {
            candidateId: updated.id,
            tab
          }
        });

        this.toastService.success(
          decision === 'accepted_for_interview'
            ? `${updated.candidateName} accepted for interview.`
            : `${updated.candidateName} rejected.`
        );

        this.closeCandidatePreview();
      },
      error: () => {
        this.candidateActionLoading = false;
        this.candidatePreviewError = 'Unable to update candidate decision.';
        this.toastService.error('Unable to update candidate decision.');
      }
    });
  }

  private normalizeJobsResponse(response: unknown): EmployerJob[] {
    const list = this.extractJobsList(response);
    return list.map(item => this.mapApiJobToEmployerJob(item));
  }

  private extractJobsList(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response as Array<Record<string, unknown>>;
    }

    if (response && typeof response === 'object') {
      const asRecord = response as Record<string, unknown>;

      if (Array.isArray(asRecord['jobs'])) {
        return asRecord['jobs'] as Array<Record<string, unknown>>;
      }

      if (Array.isArray(asRecord['data'])) {
        return asRecord['data'] as Array<Record<string, unknown>>;
      }
    }

    return [];
  }

  private mapApiJobToEmployerJob(item: Record<string, unknown>): EmployerJob {
    const workTypeRaw = this.asString(item['workType']) || this.asString(item['type']) || 'Full Time';
    const budget = this.asRecord(item['budget']);
    const minBudget = Number(budget?.['min'] || 0);
    const maxBudget = Number(budget?.['max'] || 0);
    const salary = Number(item['salary'] || maxBudget || minBudget || 0);
    const id = this.asString(item['_id']) || this.asString(item['id']) || `job-${Date.now()}-${Math.random()}`;

    return {
      id,
      title: this.asString(item['title']) || 'Untitled role',
      department: this.asString(item['department']) || this.asString(item['category']) || 'General',
      description: this.asString(item['description']) || '',
      salary,
      type: this.mapApiWorkTypeToEnum(workTypeRaw),
      category: this.asString(item['category']) || this.asString(item['department']) || 'General',
      skillsRequired: Array.isArray(item['skillsRequired']) ? (item['skillsRequired'] as string[]) : [],
      experienceLevel: this.mapApiExperienceLevel(this.asString(item['experienceLevel'])),
      minExperience: this.asString(item['minExperience']) || '0',
      location: this.asString(item['location']) || this.resolveLocationFromWorkType(workTypeRaw),
      deadline: this.asString(item['deadline']) || this.defaultDeadline(),
      priority: this.mapPriority(this.asString(item['priority'])),
      createdAt: this.asString(item['createdAt']) || new Date().toISOString(),
      applicantsCount: Number(item['applicantsCount'] || 0),
      openRoles: Number(item['openRoles'] || 1),
      source: 'api'
    };
  }

  private mapApiWorkTypeToEnum(workType: string): WorkType {
    const normalized = String(workType || '').trim().toLowerCase();
    if (normalized.includes('remote')) return WorkType.Remote;
    if (normalized.includes('hybrid')) return WorkType.Hybrid;
    if (normalized.includes('part')) return WorkType.PartTime;
    if (normalized.includes('on')) return WorkType.Onsite;
    return WorkType.FullTime;
  }

  private mapApiExperienceLevel(level: string): EmployerJob['experienceLevel'] {
    const normalized = String(level || '').trim().toLowerCase();
    if (normalized.includes('jun')) return 'junior';
    if (normalized.includes('sen')) return 'senior';
    return 'mid';
  }

  private mapPriority(priority: string): EmployerJob['priority'] {
    const normalized = String(priority || '').trim().toLowerCase();
    if (normalized === 'low' || normalized === 'high') return normalized;
    return 'medium';
  }

  private resolveLocationFromWorkType(workType: string): string {
    const normalized = String(workType || '').trim().toLowerCase();
    if (normalized.includes('remote')) return 'Remote';
    return 'Cairo, Egypt';
  }

  private defaultDeadline(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
