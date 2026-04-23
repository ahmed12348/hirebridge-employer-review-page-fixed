import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, combineLatest, switchMap, distinctUntilChanged } from 'rxjs';

import {
  EmployerApplicant,
  EmployerApplicationsService
} from '../../../core/services/employer-applications.service';
import {
  InterviewSchedulingService,
  ScheduleInterviewPayload
} from '../../../core/services/interview-scheduling.service';
import { EmployerJob, EmployerJobsService } from '../../../core/services/employer-jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus
} from '../../../shared/enums/application-status.enum';
import { INTERVIEW_STATUS_LABELS, InterviewStatus } from '../../../shared/enums/interview-status.enum';
import { ScheduledInterview } from '../../../shared/models/interview.model';

type ReviewTab = 'pending' | 'accepted' | 'rejected' | 'replacement' | 'hired';

@Component({
  standalone: true,
  selector: 'app-employer-review-candidates-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './review-candidates-page.component.html',
  styleUrls: ['./review-candidates-page.component.css']
})
export class EmployerReviewCandidatesPageComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  actionError = '';
  actionSuccess = '';
  job: EmployerJob | null = null;
  applicants: EmployerApplicant[] = [];
  interviews: ScheduledInterview[] = [];
  processingApplicantId: string | null = null;
  activeTab: ReviewTab = 'pending';
  selectedCandidateId = '';
  requestDetailsLink = '/employer/jobs';
  interviewModalApplicant: EmployerApplicant | null = null;
  interviewForm: ScheduleInterviewPayload = this.createDefaultInterviewForm();
  private requestedTab: ReviewTab | null = null;
  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private jobsService: EmployerJobsService,
    private employerApplicationsService: EmployerApplicationsService,
    private interviewSchedulingService: InterviewSchedulingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const jobId = params.get('id');

        if (!jobId) {
          this.loading = false;
          this.error = 'Hiring request not found.';
          return;
        }

        this.loadReviewPage(jobId);
      })
    );

    this.subscriptions.add(
      this.route.queryParamMap.subscribe(queryParams => {
        const candidateId = queryParams.get('candidateId') || '';
        const tab = queryParams.get('tab');

        this.selectedCandidateId = candidateId;

        if (tab === 'pending' || tab === 'accepted' || tab === 'rejected' || tab === 'replacement' || tab === 'hired') {
          this.requestedTab = tab;
        } else {
          this.requestedTab = null;
        }

        this.applyTabSelection();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get currentJob(): EmployerJob {
    return this.job as EmployerJob;
  }

  get visibleApplicants(): EmployerApplicant[] {
    return this.applicants.filter(applicant => applicant.shortlistStage !== 'recommended');
  }

  get pendingApplicants(): EmployerApplicant[] {
    return this.visibleApplicants.filter(applicant => !applicant.companyDecision || applicant.companyDecision === 'pending');
  }

  get acceptedApplicants(): EmployerApplicant[] {
    return this.visibleApplicants.filter(applicant => applicant.companyDecision === 'accepted_for_interview');
  }

  get rejectedApplicants(): EmployerApplicant[] {
    return this.visibleApplicants.filter(applicant => applicant.companyDecision === 'rejected');
  }

  get replacementApplicants(): EmployerApplicant[] {
    return this.visibleApplicants.filter(applicant => applicant.companyDecision === 'request_replacement');
  }

  get hiredApplicants(): EmployerApplicant[] {
    return this.visibleApplicants.filter(applicant => applicant.companyDecision === 'hired');
  }

  get displayedApplicants(): EmployerApplicant[] {
    const map: Record<ReviewTab, EmployerApplicant[]> = {
      pending: this.pendingApplicants,
      accepted: this.acceptedApplicants,
      rejected: this.rejectedApplicants,
      replacement: this.replacementApplicants,
      hired: this.hiredApplicants
    };

    return map[this.activeTab];
  }

  get activeTabLabel(): string {
    const labels: Record<ReviewTab, string> = {
      pending: 'Pending Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
      replacement: 'Replacement Requested',
      hired: 'Hired'
    };

    return labels[this.activeTab];
  }

  get reviewProgressPercent(): number {
    if (!this.visibleApplicants.length) return 0;
    const completed = this.visibleApplicants.filter(
      applicant => applicant.companyDecision && applicant.companyDecision !== 'pending'
    ).length;
    return Math.round((completed / this.visibleApplicants.length) * 100);
  }

  get averageFitScore(): number {
    if (!this.visibleApplicants.length) return 0;
    const total = this.visibleApplicants.reduce((sum, applicant) => sum + (applicant.fitScore || 0), 0);
    return Math.round(total / this.visibleApplicants.length);
  }

  get scheduledInterviewCount(): number {
    return this.interviews.filter(
      interview =>
        interview.status === InterviewStatus.Scheduled ||
        interview.status === InterviewStatus.Rescheduled
    ).length;
  }

  getStatusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  getInterviewStatusLabel(status: InterviewStatus): string {
    return INTERVIEW_STATUS_LABELS[status];
  }

  getCompanyDecisionLabel(applicant: EmployerApplicant): string {
    const labels: Record<string, string> = {
      pending: 'Pending company review',
      accepted_for_interview: 'Accepted for interview',
      rejected: 'Rejected by company',
      request_replacement: 'Replacement requested',
      hired: 'Hired - probation active'
    };

    return labels[applicant.companyDecision || 'pending'] || 'Pending company review';
  }

  getSalaryMatchLabel(match: EmployerApplicant['salaryMatch']): string {
    const labels: Record<EmployerApplicant['salaryMatch'], string> = {
      within_budget: 'Within budget',
      slightly_above: 'Slightly above budget',
      out_of_budget: 'Out of budget'
    };

    return labels[match];
  }

  getProbationLabel(prediction?: EmployerApplicant['probationPrediction']): string {
    const labels = {
      low_risk: 'Low risk',
      watch: 'Watch closely',
      strong: 'Strong outlook'
    };

    return labels[prediction || 'watch'];
  }

  getFraudRiskLabel(risk?: EmployerApplicant['fraudRisk']): string {
    const labels = {
      low: 'Low risk',
      medium: 'Needs review',
      high: 'High risk'
    };

    return labels[risk || 'low'];
  }

  setActiveTab(tab: ReviewTab): void {
    this.activeTab = tab;
  }

  acceptCandidate(applicant: EmployerApplicant): void {
    this.runApplicantAction(
      applicant.id,
      () => this.employerApplicationsService.updateCompanyDecision(applicant.id, 'accepted_for_interview'),
      `${applicant.candidateName} accepted for interview.`,
      'accepted'
    );
  }

  rejectCandidate(applicant: EmployerApplicant): void {
    this.runApplicantAction(
      applicant.id,
      () => this.employerApplicationsService.updateCompanyDecision(applicant.id, 'rejected'),
      `${applicant.candidateName} rejected.`,
      'rejected'
    );
  }

  requestReplacement(applicant: EmployerApplicant): void {
    this.runApplicantAction(
      applicant.id,
      () => this.employerApplicationsService.updateCompanyDecision(applicant.id, 'request_replacement'),
      `Replacement requested instead of ${applicant.candidateName}.`,
      'replacement'
    );
  }

  markHired(applicant: EmployerApplicant): void {
    this.runApplicantAction(
      applicant.id,
      () => this.employerApplicationsService.updateCompanyDecision(applicant.id, 'hired'),
      `${applicant.candidateName} marked as hired.`,
      'hired'
    );
  }

  scheduleInterview(applicant: EmployerApplicant): void {
    if (!this.job || this.processingApplicantId) return;

    this.interviewModalApplicant = applicant;
    this.interviewForm = this.createDefaultInterviewForm(applicant);
    this.actionError = '';
    this.actionSuccess = '';
  }

  closeInterviewModal(): void {
    this.interviewModalApplicant = null;
    this.interviewForm = this.createDefaultInterviewForm();
  }

  submitInterviewSchedule(): void {
    if (!this.job || !this.interviewModalApplicant || this.processingApplicantId) return;

    const applicant = this.interviewModalApplicant;
    this.processingApplicantId = applicant.id;
    this.actionError = '';
    this.actionSuccess = '';

    const payload: ScheduleInterviewPayload = {
      ...this.interviewForm,
      applicantId: applicant.id,
      jobId: this.job.id,
      candidateName: applicant.candidateName
    };

    this.interviewSchedulingService.scheduleInterview(payload).subscribe({
      next: interview => {
        this.interviews = [interview, ...this.interviews.filter(item => item.id !== interview.id)];
        this.processingApplicantId = null;
        this.actionSuccess = `Interview scheduled for ${applicant.candidateName}.`;
        this.toastService.success(`Interview scheduled for ${applicant.candidateName}.`);
        this.closeInterviewModal();
      },
      error: () => {
        this.processingApplicantId = null;
        this.actionError = 'Unable to schedule interview.';
        this.toastService.error('Unable to schedule interview.');
      }
    });
  }

  private runApplicantAction(
    applicantId: string,
    request: () => any,
    successMessage: string,
    nextTab?: ReviewTab
  ): void {
    if (this.processingApplicantId) return;

    this.processingApplicantId = applicantId;
    this.actionError = '';
    this.actionSuccess = '';

    request().subscribe({
      next: (updated: EmployerApplicant) => {
        this.applicants = this.sortApplicants(
          this.applicants.map(item => (item.id === updated.id ? updated : item))
        );
        this.processingApplicantId = null;
        this.actionSuccess = successMessage;
        this.toastService.success(successMessage);
        if (nextTab) this.activeTab = nextTab;
      },
      error: () => {
        this.processingApplicantId = null;
        this.actionError = 'Unable to update company decision.';
        this.toastService.error('Unable to update company decision.');
      }
    });
  }

  private sortApplicants(applicants: EmployerApplicant[]): EmployerApplicant[] {
    return [...applicants].sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
  }

  private getNextInterviewDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().slice(0, 10);
  }

  private loadReviewPage(jobId: string): void {
    this.loading = true;
    this.error = '';
    this.actionError = '';
    this.actionSuccess = '';

    // Ensure company ID is fetched first, then load all data for this job review
    this.subscriptions.add(
      this.jobsService.getOrFetchCompanyId().pipe(
        switchMap(() =>
          combineLatest<
            [EmployerJob, EmployerApplicant[], ScheduledInterview[]]
          >([
            this.jobsService.getJobById(jobId),
            this.employerApplicationsService.getApplicantsByJob(jobId),
            this.interviewSchedulingService.getInterviewsByJob(jobId)
          ])
        ),
        distinctUntilChanged()
      ).subscribe({
        next: (data) => {
          const [job, applicants, interviews] = data;
          if (job) {
            this.job = job;
            this.requestDetailsLink = `/employer/jobs/${job.id}`;
            this.applicants = this.sortApplicants(applicants);
            this.interviews = [...interviews];
            this.applyTabSelection();
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load candidate review page.';
        }
      })
    );
  }

  trackInterviewModalBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeInterviewModal();
    }
  }

  getInterviewTypeLabel(interview: ScheduledInterview): string {
    const location = interview.type === 'Onsite' ? interview.location : interview.meetingLink;
    return location ? `${interview.type} • ${location}` : interview.type;
  }

  isSelectedApplicant(applicantId: string): boolean {
    return this.selectedCandidateId === applicantId;
  }

  getInitials(name: string): string {
    const parts = (name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'NA';
    }

    return parts.map(part => part.charAt(0).toUpperCase()).join('');
  }

  private createDefaultInterviewForm(applicant?: EmployerApplicant): ScheduleInterviewPayload {
    return {
      applicantId: applicant?.id || '',
      jobId: this.job?.id || '',
      candidateName: applicant?.candidateName || '',
      date: this.getNextInterviewDate(),
      time: '11:00',
      type: 'Online',
      interviewerName: 'HireBridge Coordinator',
      location: '',
      meetingLink: 'https://meet.example.com/hirebridge-review',
      notes: applicant
        ? `Interview created after company approval for ${applicant.candidateName}.`
        : ''
    };
  }

  private applyTabSelection(): void {
    if (this.requestedTab) {
      this.activeTab = this.requestedTab;
      return;
    }

    if (!this.selectedCandidateId || !this.applicants.length) {
      this.activeTab = 'pending';
      return;
    }

    const selectedApplicant = this.applicants.find(applicant => applicant.id === this.selectedCandidateId);

    if (!selectedApplicant) {
      this.activeTab = 'pending';
      return;
    }

    const decision = selectedApplicant.companyDecision || 'pending';
    const map: Record<string, ReviewTab> = {
      pending: 'pending',
      accepted_for_interview: 'accepted',
      rejected: 'rejected',
      request_replacement: 'replacement',
      hired: 'hired'
    };

    this.activeTab = map[decision] || 'pending';
  }
}
