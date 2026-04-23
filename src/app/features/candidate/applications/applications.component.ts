import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApplicationsService, CandidateApplication } from '../../../core/services/applications.service';
import { APPLICATION_STATUS_LABELS, ApplicationStatus } from '../../../shared/enums/application-status.enum';
import { INTERVIEW_STATUS_LABELS } from '../../../shared/enums/interview-status.enum';

@Component({
  standalone: true,
  selector: 'app-candidate-applications',
  imports: [CommonModule, FormsModule],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.css']
})
export class ApplicationsComponent implements OnInit {
  loading = false;
  error = '';
  actionMessage = '';
  applications: CandidateApplication[] = [];
  statusFilter = 'all';
  searchTerm = '';

  constructor(private applicationsService: ApplicationsService) {}

  ngOnInit() {
    this.loadApplications();
  }

  get filteredApplications(): CandidateApplication[] {
    const filter = this.statusFilter.toLowerCase();
    const search = this.searchTerm.toLowerCase();

    return this.applications.filter(app => {
      const matchStatus = filter === 'all' || this.normalizeStatus(app.status) === filter;
      const terms = [
        app.jobTitle,
        app.companyName,
        app.status,
        app.interview?.type,
        app.interview?.interviewerName,
        app.interview?.location
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = !search || terms.includes(search);
      return matchStatus && matchSearch;
    });
  }

  private loadApplications() {
    this.loading = true;
    this.error = '';
    this.applicationsService.getApplications().subscribe({
      next: applications => {
        this.loading = false;
        this.applications = applications;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load applications';
      }
    });
  }

  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly interviewStatusLabels = INTERVIEW_STATUS_LABELS;

  normalizeStatus(value: any): string {
    const status = String(value || ApplicationStatus.Applied).trim().toLowerCase();
    if (status === ApplicationStatus.Hired) return ApplicationStatus.Hired;
    if (status === ApplicationStatus.Accepted) return ApplicationStatus.Accepted;
    if (status === ApplicationStatus.Rejected) return ApplicationStatus.Rejected;
    if (status === ApplicationStatus.InterviewScheduled) return ApplicationStatus.InterviewScheduled;
    if (status === ApplicationStatus.Shortlisted) return ApplicationStatus.Shortlisted;
    if (status === ApplicationStatus.UnderReview) return ApplicationStatus.UnderReview;
    return ApplicationStatus.Applied;
  }

  getStatusBadgeClass(value: any): string {
    const status = this.normalizeStatus(value);
    if (status === ApplicationStatus.Hired) return 'bg-success';
    if (status === ApplicationStatus.Accepted) return 'bg-success';
    if (status === ApplicationStatus.Rejected) return 'bg-danger';
    if (status === ApplicationStatus.InterviewScheduled) return 'bg-primary';
    if (status === ApplicationStatus.Shortlisted) return 'bg-info text-dark';
    return 'bg-warning text-dark';
  }

  getStatusLabel(value: any): string {
    return this.statusLabels[this.normalizeStatus(value) as ApplicationStatus] || 'Applied';
  }

  getInterviewStatusLabel(value: CandidateApplication): string | null {
    return value.interview ? this.interviewStatusLabels[value.interview.status] : null;
  }

  canDecide(app: CandidateApplication): boolean {
    const status = this.normalizeStatus(app.status);
    return (
      status !== ApplicationStatus.Accepted &&
      status !== ApplicationStatus.Hired &&
      status !== ApplicationStatus.Rejected
    );
  }

  accept(app: CandidateApplication): void {
    if (!this.canDecide(app)) {
      return;
    }

    const previousStatus = app.status;
    app.status = ApplicationStatus.Accepted;
    this.actionMessage = '';
    this.error = '';

    this.applicationsService.acceptApplication(app.id).subscribe({
      next: () => {
        this.actionMessage = `Application for ${app.jobTitle} marked as accepted.`;
      },
      error: () => {
        app.status = previousStatus;
        this.error = 'Unable to update application status.';
      }
    });
  }

  reject(app: CandidateApplication): void {
    if (!this.canDecide(app)) {
      return;
    }

    const previousStatus = app.status;
    app.status = ApplicationStatus.Rejected;
    this.actionMessage = '';
    this.error = '';

    this.applicationsService.rejectApplication(app.id).subscribe({
      next: () => {
        this.actionMessage = `Application for ${app.jobTitle} marked as rejected.`;
      },
      error: () => {
        app.status = previousStatus;
        this.error = 'Unable to update application status.';
      }
    });
  }
}
