import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { switchMap, distinctUntilChanged } from 'rxjs/operators';

import {
  EmployerApplicant,
  EmployerApplicationsService
} from '../../../core/services/employer-applications.service';
import {
  InterviewSchedulingService,
  ScheduleInterviewPayload
} from '../../../core/services/interview-scheduling.service';
import { EmployerJob, EmployerJobsService } from '../../../core/services/employer-jobs.service';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus
} from '../../../shared/enums/application-status.enum';
import { INTERVIEW_STATUS_LABELS, InterviewStatus } from '../../../shared/enums/interview-status.enum';
import { ScheduledInterview } from '../../../shared/models/interview.model';

@Component({
  standalone: true,
  selector: 'app-employer-job-details-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './job-details-page.component.html',
  styleUrls: ['./job-details-page.component.css']
})
export class EmployerJobDetailsPageComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  actionError = '';
  actionSuccess = '';
  job: EmployerJob | null = null;
  interviews: ScheduledInterview[] = [];
  applicants: EmployerApplicant[] = [];
  processingApplicantId: string | null = null;
  reviewCandidatesLink = '/employer/jobs';
  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private jobsService: EmployerJobsService,
    private interviewSchedulingService: InterviewSchedulingService,
    private employerApplicationsService: EmployerApplicationsService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const jobId = params.get('id');

        if (!jobId) {
          this.loading = false;
          this.error = 'Job not found.';
          return;
        }

        this.loadJob(jobId);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get upcomingInterviewsCount(): number {
    return this.interviews.filter(
      interview =>
        interview.status === InterviewStatus.Scheduled ||
        interview.status === InterviewStatus.Rescheduled
    ).length;
  }

  get completedInterviewsCount(): number {
    return this.interviews.filter(interview => interview.status === InterviewStatus.Completed).length;
  }

  get recommendedCandidatesCount(): number {
    return this.applicants.length;
  }

  get sentCandidatesCount(): number {
    return this.applicants.filter(applicant => applicant.shortlistStage !== 'recommended').length;
  }

  get hiredCandidatesCount(): number {
    return this.applicants.filter(applicant => applicant.companyDecision === 'hired').length;
  }

  get remainingHeadcount(): number {
    return Math.max((this.job?.openRoles || 0) - this.hiredCandidatesCount, 0);
  }

  get averageFitScore(): number {
    if (!this.applicants.length) return 0;
    const total = this.applicants.reduce((sum, applicant) => sum + (applicant.fitScore || 0), 0);
    return Math.round(total / this.applicants.length);
  }

  get statusSummary(): string {
    if (!this.job) return 'Unknown';
    if (this.hiredCandidatesCount >= this.job.openRoles) {
      return 'Filled';
    }
    if (this.sentCandidatesCount > 0) {
      return 'Shortlist in progress';
    }
    return 'Request under review';
  }

  get hiringSummary(): string {
    if (!this.job) return '';

    return `${this.job.openRoles} requested headcount with ${this.recommendedCandidatesCount} recommended candidate${this.recommendedCandidatesCount === 1 ? '' : 's'}, ${this.sentCandidatesCount} shared with the company, and ${this.hiredCandidatesCount} filled so far.`;
  }

  get progressPercent(): number {
    if (!this.job?.openRoles) return 0;
    return Math.min(100, Math.round((this.hiredCandidatesCount / this.job.openRoles) * 100));
  }

  getStatusLabel(status: InterviewStatus): string {
    return INTERVIEW_STATUS_LABELS[status];
  }

  getApplicantStatusLabel(status: ApplicationStatus): string {
    return APPLICATION_STATUS_LABELS[status];
  }

  getShortlistStageLabel(applicant: EmployerApplicant): string {
    const labels: Record<string, string> = {
      recommended: 'Recommended',
      sent_to_company: 'Sent to company',
      interviewing: 'Interviewing',
      offer: 'Offer / final review',
      hired: 'Hired'
    };

    return labels[applicant.shortlistStage || 'recommended'] || 'Recommended';
  }

  getCompanyDecisionLabel(applicant: EmployerApplicant): string {
    const labels: Record<string, string> = {
      pending: 'Pending company feedback',
      accepted_for_interview: 'Accepted for interview',
      rejected: 'Rejected by company',
      request_replacement: 'Replacement requested',
      hired: 'Hired - probation active'
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

  getFraudRiskLabel(risk?: EmployerApplicant['fraudRisk']): string {
    const labels = {
      low: 'Low risk',
      medium: 'Needs review',
      high: 'High risk'
    };

    return labels[risk || 'low'];
  }

  getProbationLabel(prediction?: EmployerApplicant['probationPrediction']): string {
    const labels = {
      low_risk: 'Low risk',
      watch: 'Watch probation',
      strong: 'Strong prediction'
    };

    return labels[prediction || 'watch'];
  }

  acceptApplicant(applicant: EmployerApplicant): void {
    this.runApplicantAction(applicant.id, () =>
      this.employerApplicationsService.updateStatus(applicant.id, ApplicationStatus.Accepted),
      'Candidate moved to final review.'
    );
  }

  rejectApplicant(applicant: EmployerApplicant): void {
    this.runApplicantAction(applicant.id, () =>
      this.employerApplicationsService.updateStatus(applicant.id, ApplicationStatus.Rejected),
      'Candidate rejected.'
    );
  }

  acceptForInterview(applicant: EmployerApplicant): void {
    this.runApplicantAction(applicant.id, () =>
      this.employerApplicationsService.updateCompanyDecision(applicant.id, 'accepted_for_interview'),
      'Candidate approved for interview.'
    );
  }

  requestReplacement(applicant: EmployerApplicant): void {
    this.runApplicantAction(applicant.id, () =>
      this.employerApplicationsService.updateCompanyDecision(applicant.id, 'request_replacement'),
      'Replacement candidate requested.'
    );
  }

  markHired(applicant: EmployerApplicant): void {
    this.runApplicantAction(applicant.id, () =>
      this.employerApplicationsService.updateCompanyDecision(applicant.id, 'hired'),
      'Candidate marked as hired.'
    );
  }

  scheduleInterview(applicant: EmployerApplicant): void {
    if (!this.job || this.processingApplicantId) return;

    this.processingApplicantId = applicant.id;
    this.actionError = '';
    this.actionSuccess = '';

    const date = this.getNextInterviewDate();
    const payload: ScheduleInterviewPayload = {
      applicantId: applicant.id,
      jobId: this.job.id,
      candidateName: applicant.candidateName,
      date,
      time: '11:00',
      type: 'Online',
      interviewerName: 'HireBridge Coordinator',
      meetingLink: 'https://meet.example.com/hirebridge-review',
      notes: `Auto-scheduled mock interview for ${applicant.candidateName}.`
    };

    this.interviewSchedulingService.scheduleInterview(payload).subscribe({
      next: interview => {
        this.interviews = this.sortInterviews([
          interview,
          ...this.interviews.filter(item => item.id !== interview.id)
        ]);
        this.processingApplicantId = null;
        this.actionSuccess = `Interview scheduled for ${applicant.candidateName}.`;
      },
      error: () => {
        this.processingApplicantId = null;
        this.actionError = 'Unable to schedule interview.';
      }
    });
  }

  private runApplicantAction(
    applicantId: string,
    request: () => any,
    successMessage: string
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
      },
      error: () => {
        this.processingApplicantId = null;
        this.actionError = 'Unable to update candidate status.';
      }
    });
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

  private getNextInterviewDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().slice(0, 10);
  }

  private loadJob(jobId: string): void {
    this.loading = true;
    this.error = '';
    this.actionError = '';
    this.actionSuccess = '';

    // Ensure company ID is fetched first, then load all data for this job
    this.subscriptions.add(
      this.jobsService.getOrFetchCompanyId().pipe(
        switchMap(() =>
          combineLatest([
            this.jobsService.getJobById(jobId),
            this.interviewSchedulingService.getInterviewsByJob(jobId),
            this.employerApplicationsService.getApplicantsByJob(jobId)
          ])
        ),
        distinctUntilChanged()
      ).subscribe({
        next: ([job, interviews, applicants]) => {
          if (job) {
            this.job = job;
            this.reviewCandidatesLink = `/employer/jobs/${job.id}/review-candidates`;
            this.interviews = this.sortInterviews(interviews);
            this.applicants = this.sortApplicants(applicants);
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load job details.';
        }
      })
    );
  }
}
