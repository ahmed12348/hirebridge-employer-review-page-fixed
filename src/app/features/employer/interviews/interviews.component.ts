import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { InterviewSchedulingService } from '../../../core/services/interview-scheduling.service';
import { EmployerJobsService } from '../../../core/services/employer-jobs.service';
import { INTERVIEW_STATUS_LABELS, InterviewStatus } from '../../../shared/enums/interview-status.enum';
import { InterviewOutcome, ScheduledInterview } from '../../../shared/models/interview.model';

@Component({
  selector: 'app-employer-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './interviews.component.html',
  styleUrls: ['./interviews.component.css']
})
export class EmployerInterviewsComponent implements OnInit {
  loading = false;
  error = '';
  successMessage = '';
  selectedInterview: ScheduledInterview | null = null;
  interviews: ScheduledInterview[] = [];
  searchTerm = '';
  statusFilter = 'all';
  jobTitles: Record<string, string> = {};

  constructor(
    private router: Router,
    private interviewSchedulingService: InterviewSchedulingService,
    private employerJobsService: EmployerJobsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get filteredInterviews(): ScheduledInterview[] {
    const search = this.searchTerm.trim().toLowerCase();
    const filter = this.statusFilter.toLowerCase();

    return [...this.interviews]
      .filter(interview => {
        const matchesStatus = filter === 'all' || interview.status === filter;
        const haystack = [
          interview.candidateName,
          this.getJobTitle(interview.jobId),
          interview.interviewerName,
          interview.type,
          interview.location,
          interview.notes
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time}`).getTime();
        const bDate = new Date(`${b.date}T${b.time}`).getTime();
        return aDate - bDate;
      });
  }

  get upcomingCount(): number {
    return this.interviews.filter(item => item.status === InterviewStatus.Scheduled).length;
  }

  get completedCount(): number {
    return this.interviews.filter(item => item.status === InterviewStatus.Completed).length;
  }

  get cancelledCount(): number {
    return this.interviews.filter(item => item.status === InterviewStatus.Cancelled).length;
  }

  get inProgressCount(): number {
    return this.interviews.filter(
      item =>
        item.status === InterviewStatus.Scheduled ||
        item.status === InterviewStatus.Rescheduled
    ).length;
  }

  get feedbackPendingCount(): number {
    return this.interviews.filter(
      item => item.status === InterviewStatus.Completed && (item.outcome || 'pending') === 'pending'
    ).length;
  }

  get hiringManagerReviewCount(): number {
    return this.interviews.filter(
      item => item.status === InterviewStatus.Completed && (item.outcome === 'passed' || item.outcome === 'failed')
    ).length;
  }

  get passedCount(): number {
    return this.interviews.filter(item => item.outcome === 'passed').length;
  }

  get failedCount(): number {
    return this.interviews.filter(item => item.outcome === 'failed').length;
  }

  get decisionQueue(): ScheduledInterview[] {
    return this.filteredInterviews
      .filter(item => item.status === InterviewStatus.Completed || item.status === InterviewStatus.Rescheduled)
      .slice(0, 3);
  }

  get interviewerLoad(): Array<{ name: string; count: number }> {
    const load = this.filteredInterviews.reduce((acc, interview) => {
      const key = (interview.interviewerName || 'Unassigned').trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(load)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  get pipelineHealthPercent(): number {
    if (!this.interviews.length) {
      return 0;
    }

    const completedWeight = this.completedCount * 1.25;
    const inProgressWeight = this.inProgressCount * 0.75;
    const base = ((completedWeight + inProgressWeight) / this.interviews.length) * 100;
    return Math.max(0, Math.min(100, Math.round(base)));
  }

  getStatusLabel(status: InterviewStatus): string {
    return INTERVIEW_STATUS_LABELS[status];
  }

  getStatusBadgeClass(status: InterviewStatus): string {
    const classes: Record<InterviewStatus, string> = {
      [InterviewStatus.Scheduled]: 'status-badge scheduled',
      [InterviewStatus.Rescheduled]: 'status-badge rescheduled',
      [InterviewStatus.Completed]: 'status-badge completed',
      [InterviewStatus.Cancelled]: 'status-badge cancelled'
    };

    return classes[status];
  }

  getOutcomeLabel(outcome?: InterviewOutcome): string {
    const value = outcome || 'pending';
    const labels: Record<InterviewOutcome, string> = {
      pending: 'Pending decision',
      passed: 'Passed',
      failed: 'Failed'
    };

    return labels[value];
  }

  getOutcomeBadgeClass(outcome?: InterviewOutcome): string {
    const value = outcome || 'pending';
    const classes: Record<InterviewOutcome, string> = {
      pending: 'status-badge rescheduled',
      passed: 'status-badge completed',
      failed: 'status-badge cancelled'
    };

    return classes[value];
  }

  markCompleted(interviewId: string): void {
    this.successMessage = '';
    this.error = '';

    const previous = this.interviews.find(item => item.id === interviewId);
    if (previous) {
      this.updateInterviewInList({ ...previous, status: InterviewStatus.Completed });
    }

    this.interviewSchedulingService.completeInterview(interviewId).subscribe({
      next: updated => {
        this.updateInterviewInList(updated);
        this.successMessage = 'Interview marked as completed.';
      },
      error: () => {
        if (previous) {
          this.updateInterviewInList(previous);
        }
        this.error = 'Unable to update interview.';
      }
    });
  }

  cancelInterview(interviewId: string): void {
    this.successMessage = '';
    this.error = '';

    const previous = this.interviews.find(item => item.id === interviewId);
    if (previous) {
      this.updateInterviewInList({ ...previous, status: InterviewStatus.Cancelled });
    }

    this.interviewSchedulingService.cancelInterview(interviewId).subscribe({
      next: updated => {
        this.updateInterviewInList(updated);
        this.successMessage = 'Interview cancelled.';
      },
      error: () => {
        if (previous) {
          this.updateInterviewInList(previous);
        }
        this.error = 'Unable to cancel interview.';
      }
    });
  }

  setInterviewOutcome(interview: ScheduledInterview, outcome: InterviewOutcome): void {
    this.successMessage = '';
    this.error = '';

    const previous = { ...interview };
    const optimistic: ScheduledInterview = {
      ...interview,
      status: InterviewStatus.Completed,
      outcome,
      outcomeRecordedAt: new Date().toISOString(),
      probationStarted: outcome === 'passed'
    };

    this.updateInterviewInList(optimistic);

    this.interviewSchedulingService.recordInterviewOutcome(interview.id, outcome).subscribe({
      next: updated => {
        this.updateInterviewInList(updated);

        if (outcome === 'passed') {
          this.successMessage = `${updated.candidateName} passed. Hire confirmed and probation started.`;
          return;
        }

        if (outcome === 'failed') {
          this.successMessage = `${updated.candidateName} marked as failed.`;
          return;
        }

        this.successMessage = `${updated.candidateName} marked as pending decision.`;
      },
      error: () => {
        this.updateInterviewInList(previous);
        this.error = 'Unable to record interview outcome.';
      }
    });
  }

  getJobTitle(jobId: string): string {
    return this.jobTitles[jobId] || 'Job opportunity';
  }

  getJobLink(jobId: string): string {
    return `/employer/jobs/${jobId}`;
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

  openJobDetails(jobId: string): void {
    if (!jobId) {
      this.successMessage = '';
      this.error = 'No linked hiring request was found for this interview.';
      return;
    }

    this.router.navigate(['/employer/jobs', jobId]);
  }

  openInterviewDetails(interview: ScheduledInterview): void {
    this.selectedInterview = interview;
  }

  openCandidateInReview(interview: ScheduledInterview): void {
    if (!interview.jobId || !interview.applicantId) {
      this.successMessage = '';
      this.error = 'Unable to open candidate review for this interview.';
      return;
    }

    this.router.navigate([`/employer/jobs/${interview.jobId}/review-candidates`], {
      queryParams: {
        candidateId: interview.applicantId
      }
    });
  }

  closeInterviewDetails(): void {
    this.selectedInterview = null;
  }

  trackInterviewDetailsBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeInterviewDetails();
    }
  }

  private loadData(): void {
    this.loading = true;
    this.error = '';

    this.interviewSchedulingService.getAllInterviews().subscribe({
      next: interviews => {
        this.interviews = interviews;
        this.loadJobTitles();
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load interviews.';
      }
    });
  }

  private loadJobTitles(): void {
    this.employerJobsService.getJobs().subscribe({
      next: jobs => {
        this.jobTitles = jobs.reduce((acc, job) => {
          acc[job.id] = job.title;
          return acc;
        }, {} as Record<string, string>);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private updateInterviewInList(updated: ScheduledInterview): void {
    this.interviews = this.interviews.map(item => item.id === updated.id ? updated : item);
  }
}
