import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, shareReplay, startWith } from 'rxjs/operators';

import { ApplicationStatus } from '../../shared/enums/application-status.enum';
import { InterviewSchedulingService } from './interview-scheduling.service';
import { EmployerJobsService } from './employer-jobs.service';
import { EmployerApplicationsService } from './employer-applications.service';
import { ScheduledInterview } from '../../shared/models/interview.model';

export interface CandidateApplication {
  id: string;
  applicantId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatus;
  createdAt: string;
  fitScore?: number;
  interview?: ScheduledInterview | null;
  source?: 'local' | 'mock' | 'api';
}

const INITIAL_CANDIDATE_APPLICATIONS: CandidateApplication[] = [
  {
    id: 'cand-app-001',
    applicantId: 'app-001',
    jobId: 'job-001',
    jobTitle: 'Frontend Angular Engineer',
    companyName: 'HireBridge Partner',
    status: ApplicationStatus.Shortlisted,
    createdAt: '2026-04-08T09:00:00.000Z',
    fitScore: 92,
    source: 'mock'
  },
  {
    id: 'cand-app-002',
    applicantId: 'app-002',
    jobId: 'job-001',
    jobTitle: 'Frontend Angular Engineer',
    companyName: 'HireBridge Partner',
    status: ApplicationStatus.InterviewScheduled,
    createdAt: '2026-04-07T11:30:00.000Z',
    fitScore: 88,
    source: 'mock'
  },
  {
    id: 'cand-app-003',
    applicantId: 'app-004',
    jobId: 'job-002',
    jobTitle: 'Technical Recruiter',
    companyName: 'HireBridge Partner',
    status: ApplicationStatus.Applied,
    createdAt: '2026-04-06T10:15:00.000Z',
    fitScore: 82,
    source: 'mock'
  }
];

export interface ApplicationDecisionResponse {
  id: string;
  status: ApplicationStatus;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationsService {
  private readonly applicationsSubject = new BehaviorSubject<CandidateApplication[]>(INITIAL_CANDIDATE_APPLICATIONS);
  private applicationsCache$: Observable<CandidateApplication[]> | null = null;

  constructor(
    private interviewSchedulingService: InterviewSchedulingService,
    private employerJobsService: EmployerJobsService,
    private employerApplicationsService: EmployerApplicationsService
  ) {}

  getApplications(): Observable<CandidateApplication[]> {
    if (this.applicationsCache$) {
      return this.applicationsCache$;
    }

    const snapshot = this.applicationsSubject.value.map(application => ({
      ...application,
      interview: application.interview || null
    }));

    this.applicationsCache$ = this.interviewSchedulingService.getAllInterviews().pipe(
      map(interviews =>
        this.applicationsSubject.value.map(application => ({
          ...application,
          interview: interviews.find(interview => interview.applicantId === application.applicantId) || null
        }))
      ),
      startWith(snapshot),
      shareReplay(1)
    );

    return this.applicationsCache$;
  }

  hasAppliedToJob(jobId: string): boolean {
    return this.applicationsSubject.value.some(application => application.jobId === jobId);
  }

  applyToJob(jobId: string): Observable<CandidateApplication> {
    if (this.hasAppliedToJob(jobId)) {
      const existing = this.applicationsSubject.value.find(application => application.jobId === jobId);
      return existing
        ? of(existing).pipe(delay(120))
        : throwError(() => new Error('Application already exists.'));
    }

    return this.employerJobsService.getJobById(jobId).pipe(
      map(job => {
        const newApplication: CandidateApplication = {
          id: `cand-app-${Date.now()}`,
          applicantId: `app-local-${Date.now()}`,
          jobId: job.id,
          jobTitle: job.title,
          companyName: 'HireBridge Partner',
          status: ApplicationStatus.Applied,
          createdAt: new Date().toISOString(),
          fitScore: Math.min(96, 72 + Math.round(Math.random() * 18)),
          interview: null,
          source: 'mock'
        };

        this.applicationsSubject.next([newApplication, ...this.applicationsSubject.value]);
        this.applicationsCache$ = null;
        this.employerJobsService.incrementApplicantsCount(job.id);
        this.employerApplicationsService.addMockApplicant(job.id);
        return newApplication;
      }),
      delay(180)
    );
  }

  addApplicationFromAdmin(payload: {
    applicantId: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    fitScore?: number;
  }): void {
    const exists = this.applicationsSubject.value.some(
      item => item.applicantId === payload.applicantId && item.jobId === payload.jobId
    );

    if (exists) {
      return;
    }

    const newApplication: CandidateApplication = {
      id: `cand-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicantId: payload.applicantId,
      jobId: payload.jobId,
      jobTitle: payload.jobTitle,
      companyName: payload.companyName || 'HireBridge Partner',
      status: ApplicationStatus.Shortlisted,
      createdAt: new Date().toISOString(),
      fitScore: payload.fitScore,
      interview: null,
      source: 'mock'
    };

    this.applicationsSubject.next([newApplication, ...this.applicationsSubject.value]);
    this.applicationsCache$ = null;
  }

  acceptApplication(id: string): Observable<ApplicationDecisionResponse> {
    return this.updateApplicationStatus(id, ApplicationStatus.Accepted);
  }

  rejectApplication(id: string): Observable<ApplicationDecisionResponse> {
    return this.updateApplicationStatus(id, ApplicationStatus.Rejected);
  }

  private updateApplicationStatus(id: string, status: ApplicationStatus): Observable<ApplicationDecisionResponse> {
    const application = this.applicationsSubject.value.find(item => item.id === id);
    if (application) {
      application.status = status;
      this.applicationsSubject.next([...this.applicationsSubject.value]);
      this.applicationsCache$ = null;
      this.employerApplicationsService.updateFromCandidateDecision(application.applicantId, status);
    }

    return of({
      id,
      status,
      message: `Application ${status}.`
    }).pipe(delay(180));
  }
}
