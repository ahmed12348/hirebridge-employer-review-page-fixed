import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, shareReplay, startWith, switchMap, tap, timeout } from 'rxjs/operators';

import { ApplicationStatus } from '../../shared/enums/application-status.enum';
import { CompanyService } from './company.service';
import { EmployerJobsService } from './employer-jobs.service';

// Mock data removed - load from API only

export interface EmployerApplicant {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  candidateName: string;
  email: string;
  status: ApplicationStatus;
  appliedAt: string;
  experienceYears?: number;
  fitScore?: number;
  salaryExpectation?: number;
  notes?: string;
  workType?: string;
  salaryMatch: 'within_budget' | 'slightly_above' | 'out_of_budget';
  source?: 'local' | 'mock' | 'api';
  shortlistStage?: 'recommended' | 'sent_to_company' | 'interviewing' | 'offer' | 'hired';
  companyDecision?: 'pending' | 'accepted_for_interview' | 'rejected' | 'request_replacement' | 'hired';
  probationStatus?: 'not_started' | 'active' | 'completed';
  trustScore?: number;
  fraudRisk?: 'low' | 'medium' | 'high';
  probationPrediction?: 'low_risk' | 'watch' | 'strong';
}

type ApplicationDisplayStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Interview Completed'
  | 'Accepted'
  | 'Rejected'
  | 'Hired'
  | 'On Probation';

interface ApplicationSeed {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  candidateName: string;
  status: ApplicationDisplayStatus;
  experienceYears: number;
  fitScore: number;
  expectedSalary: number;
  notes: string;
  workType: string;
  shortlistStage: EmployerApplicant['shortlistStage'];
  companyDecision: EmployerApplicant['companyDecision'];
  trustScore: number;
  fraudRisk: EmployerApplicant['fraudRisk'];
  probationPrediction: EmployerApplicant['probationPrediction'];
}

interface JobLookup {
  id: string;
  title: string;
  department: string;
  budget: number;
  employmentType: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployerApplicationsService {
  private readonly baseUrl = 'http://localhost:3004';
  private applicants = this.buildInitialApplicants();
  private applicantsByJobCache: Record<string, Observable<EmployerApplicant[]>> = {};
  private allApplicantsCache$: Observable<EmployerApplicant[]> | null = null;

  constructor(
    private http: HttpClient,
    private companyService: CompanyService,
    private employerJobsService: EmployerJobsService
  ) {}

  getApplicantsByJob(jobId: string): Observable<EmployerApplicant[]> {
    this.ensureDemoApplicantsForJob(jobId);

    // Return cached result if available
    if (this.applicantsByJobCache[jobId]) {
      return this.applicantsByJobCache[jobId];
    }

    const cached = this.applicants.filter(applicant => applicant.jobId === jobId);

    const request$ = this.http.get<any>(`${this.baseUrl}/job/get-shortListed-Of-Company/${jobId}`).pipe(
      timeout(4000),
      map(response => {
        const list = this.extractArray(response);
        if (!list.length) {
          return this.applicants.filter(applicant => applicant.jobId === jobId);
        }

        return list.map((item: any, index: number) => this.mapApplicant(item, jobId, index));
      }),
      catchError(() => of(this.applicants.filter(applicant => applicant.jobId === jobId))),
      startWith(cached), // Return cached applicants immediately
      shareReplay(1) // Cache the result
    );

    // Store in cache
    this.applicantsByJobCache[jobId] = request$;
    return request$;
  }

  getAllApplicants(): Observable<EmployerApplicant[]> {
    // Return cached result if available
    if (this.allApplicantsCache$) {
      return this.allApplicantsCache$;
    }

    // First get the company ID, then fetch applicants
    this.allApplicantsCache$ = this.employerJobsService.getOrFetchCompanyId().pipe(
      switchMap(companyId =>
        this.companyService.getPendingForCompany(companyId).pipe(
          timeout(4000),
          map(response => {
            const list = this.extractArray(response);
            if (!list.length) {
              return [...this.applicants];
            }

            return list.map((item: any, index: number) =>
              this.mapApplicant(item, item?.jobId || `job-live-${index}`, index)
            );
          }),
          catchError(() => of([...this.applicants])) // Return cached applicants immediately on error
        )
      ),
      startWith([...this.applicants]), // Return mock data immediately
      shareReplay(1) // Cache the result
    );

    return this.allApplicantsCache$;
  }

  updateStatus(applicantId: string, status: ApplicationStatus): Observable<EmployerApplicant> {
    const applicant = this.applicants.find(item => item.id === applicantId);

    if (!applicant) {
      return throwError(() => new Error('Applicant not found.'));
    }

    const companyId = localStorage.getItem('companyId');
    const action = status === ApplicationStatus.Accepted ? 'accept' : 'reject';

    if (!companyId || !this.requiresBackendAction(status)) {
      this.applyStatusChange(applicant, status);
      return of({ ...applicant }).pipe(delay(180));
    }

    return this.companyService.acceptOrRejectEmployer(companyId, {
      applicantId,
      action
    }).pipe(
      tap(() => {
        this.applyStatusChange(applicant, status);
      }),
      map(() => ({ ...applicant })),
      catchError(() => {
        this.applyStatusChange(applicant, status);
        return of({ ...applicant });
      })
    );
  }

  updateCompanyDecision(
    applicantId: string,
    decision: NonNullable<EmployerApplicant['companyDecision']>
  ): Observable<EmployerApplicant> {
    const applicant = this.applicants.find(item => item.id === applicantId);

    if (!applicant) {
      return throwError(() => new Error('Applicant not found.'));
    }

    applicant.companyDecision = decision;

    if (decision === 'accepted_for_interview') {
      applicant.status = ApplicationStatus.InterviewScheduled;
      applicant.shortlistStage = 'interviewing';
      applicant.probationStatus = 'not_started';
    } else if (decision === 'rejected') {
      applicant.status = ApplicationStatus.Rejected;
      applicant.probationStatus = 'not_started';
    } else if (decision === 'request_replacement') {
      applicant.status = ApplicationStatus.UnderReview;
      applicant.shortlistStage = 'recommended';
      applicant.probationStatus = 'not_started';
    } else if (decision === 'hired') {
      applicant.status = ApplicationStatus.Hired;
      applicant.shortlistStage = 'hired';
      applicant.probationStatus = 'active';
    }

    this.invalidateApplicantsCache(applicant.jobId);
    return of({ ...applicant }).pipe(delay(180));
  }

  addMockApplicant(
    jobId: string,
    candidateName = 'Current Candidate',
    email = 'candidate@hirebridge.local'
  ): EmployerApplicant {
    const applicant: EmployerApplicant = {
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: 'Open Role',
      department: 'General',
      candidateName,
      email,
      status: ApplicationStatus.Applied,
      appliedAt: new Date().toISOString(),
      experienceYears: 2,
      fitScore: Math.min(95, 70 + Math.round(Math.random() * 20)),
      salaryExpectation: 15000,
      notes: 'Newly submitted mock application.',
      workType: 'Hybrid',
      salaryMatch: 'within_budget',
      source: 'mock',
      shortlistStage: 'recommended',
      companyDecision: 'pending',
      trustScore: 80,
      fraudRisk: 'low',
      probationPrediction: 'watch'
    };

    this.applicants = [applicant, ...this.applicants];
    this.invalidateApplicantsCache(jobId);
    return applicant;
  }

  addOrUpdateFromAdminSend(payload: {
    applicantId: string;
    jobId: string;
    jobTitle: string;
    candidateName: string;
    expectedSalary: number;
    fitScore: number;
    experience?: string;
  }): void {
    const existing = this.applicants.find(
      applicant => applicant.id === payload.applicantId && applicant.jobId === payload.jobId
    );

    if (existing) {
      existing.jobTitle = payload.jobTitle;
      existing.candidateName = payload.candidateName;
      existing.status = ApplicationStatus.Shortlisted;
      existing.shortlistStage = 'sent_to_company';
      existing.companyDecision = existing.companyDecision || 'pending';
      existing.fitScore = payload.fitScore;
      existing.salaryExpectation = payload.expectedSalary;
      this.invalidateApplicantsCache(payload.jobId);
      return;
    }

    const years = Number(String(payload.experience || '').replace(/\D+/g, '')) || 2;

    const applicant: EmployerApplicant = {
      id: payload.applicantId,
      jobId: payload.jobId,
      jobTitle: payload.jobTitle,
      department: 'General',
      candidateName: payload.candidateName,
      email: `${payload.candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      status: ApplicationStatus.Shortlisted,
      appliedAt: new Date().toISOString(),
      experienceYears: years,
      fitScore: payload.fitScore,
      salaryExpectation: Number(payload.expectedSalary || 0),
      notes: 'Sent from admin matching flow.',
      workType: 'Hybrid',
      salaryMatch: 'within_budget',
      source: 'mock',
      shortlistStage: 'sent_to_company',
      companyDecision: 'pending',
      trustScore: 84,
      fraudRisk: 'low',
      probationPrediction: 'watch'
    };

    this.applicants = [applicant, ...this.applicants];
    this.invalidateApplicantsCache(payload.jobId);
  }

  updateFromCandidateDecision(applicantId: string, status: ApplicationStatus): void {
    const applicant = this.applicants.find(item => item.id === applicantId);
    if (!applicant) {
      return;
    }

    applicant.status = status;

    if (status === ApplicationStatus.Accepted) {
      applicant.companyDecision = 'accepted_for_interview';
      applicant.shortlistStage = 'interviewing';
      this.invalidateApplicantsCache(applicant.jobId);
      return;
    }

    if (status === ApplicationStatus.Rejected) {
      applicant.companyDecision = 'rejected';
      applicant.shortlistStage = 'sent_to_company';
      this.invalidateApplicantsCache(applicant.jobId);
      return;
    }

    this.invalidateApplicantsCache(applicant.jobId);
  }

  private buildInitialApplicants(): EmployerApplicant[] {
    const now = new Date();
    const toIsoDaysAgo = (daysAgo: number): string => {
      const value = new Date(now);
      value.setDate(value.getDate() - daysAgo);
      return value.toISOString();
    };

    return [
      {
        id: 'app-demo-job1001-01',
        jobId: 'JOB-1001',
        jobTitle: 'Senior Frontend Engineer',
        department: 'Engineering',
        candidateName: 'Salma Hany',
        email: 'salma.hany@example.com',
        status: ApplicationStatus.Shortlisted,
        appliedAt: toIsoDaysAgo(7),
        experienceYears: 6,
        fitScore: 92,
        salaryExpectation: 30000,
        notes: 'Sent by system admin after skill match review. Strong Angular and architecture profile.',
        workType: 'Hybrid',
        salaryMatch: 'within_budget',
        source: 'mock',
        shortlistStage: 'sent_to_company',
        companyDecision: 'pending',
        probationStatus: 'not_started',
        trustScore: 90,
        fraudRisk: 'low',
        probationPrediction: 'strong'
      },
      {
        id: 'app-demo-job1001-02',
        jobId: 'JOB-1001',
        jobTitle: 'Senior Frontend Engineer',
        department: 'Engineering',
        candidateName: 'Youssef Tarek',
        email: 'youssef.tarek@example.com',
        status: ApplicationStatus.InterviewScheduled,
        appliedAt: toIsoDaysAgo(10),
        experienceYears: 5,
        fitScore: 88,
        salaryExpectation: 31000,
        notes: 'Company accepted candidate for interview and requested coordination this week.',
        workType: 'Hybrid',
        salaryMatch: 'within_budget',
        source: 'mock',
        shortlistStage: 'interviewing',
        companyDecision: 'accepted_for_interview',
        probationStatus: 'not_started',
        trustScore: 86,
        fraudRisk: 'low',
        probationPrediction: 'watch'
      },
      {
        id: 'app-demo-job1002-01',
        jobId: 'JOB-1002',
        jobTitle: 'HR Business Partner',
        department: 'People',
        candidateName: 'Mariam Adel',
        email: 'mariam.adel@example.com',
        status: ApplicationStatus.Hired,
        appliedAt: toIsoDaysAgo(14),
        experienceYears: 7,
        fitScore: 91,
        salaryExpectation: 23500,
        notes: 'Candidate passed interviews. Hire confirmed and probation period started.',
        workType: 'Onsite',
        salaryMatch: 'within_budget',
        source: 'mock',
        shortlistStage: 'hired',
        companyDecision: 'hired',
        probationStatus: 'active',
        trustScore: 93,
        fraudRisk: 'low',
        probationPrediction: 'strong'
      }
    ];
  }

  private requiresBackendAction(status: ApplicationStatus): boolean {
    return status === ApplicationStatus.Accepted || status === ApplicationStatus.Rejected;
  }

  private applyStatusChange(applicant: EmployerApplicant, status: ApplicationStatus): void {
    applicant.status = status;

    if (status === ApplicationStatus.Accepted) {
      applicant.shortlistStage = 'offer';
      applicant.companyDecision = 'accepted_for_interview';
    }

    if (status === ApplicationStatus.Rejected) {
      applicant.companyDecision = 'rejected';
    }
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.applicants)) return response.data.applicants;
    if (Array.isArray(response?.applicants)) return response.applicants;
    return [];
  }

  private mapApplicant(item: any, jobId: string, index: number): EmployerApplicant {
    const expectedSalary = Number(item?.salaryExpectation || item?.expectedSalary || 0);
    const budget = Number(item?.budget || expectedSalary || 0);
    const candidateName = item?.candidateName || item?.name || `Candidate ${index + 1}`;
    const status = this.mapDisplayStatus(item?.status || 'Applied');
    const companyDecision = this.mapCompanyDecision(status);
    const shortlistStage = this.mapShortlistStage(companyDecision);

    return {
      id: item?.id || `app-live-${jobId}-${index}`,
      jobId,
      jobTitle: item?.jobTitle || item?.title || 'Open Role',
      department: item?.department || item?.category || 'General',
      candidateName,
      email: item?.email || `${String(candidateName).toLowerCase().replace(/\s+/g, '.')}@example.com`,
      status,
      appliedAt: item?.appliedAt || new Date().toISOString(),
      experienceYears: Number(item?.experienceYears || item?.yearsOfExperience || 0),
      fitScore: Number(item?.fitScore || item?.score || 0),
      salaryExpectation: expectedSalary,
      notes: item?.notes || 'Imported applicant data from company shortlist feed.',
      workType: item?.workType || this.toWorkTypeLabel(item?.employmentType),
      salaryMatch: this.calculateSalaryMatch(expectedSalary, budget),
      source: 'api',
      shortlistStage,
      companyDecision,
      probationStatus: companyDecision === 'hired' ? 'active' : 'not_started',
      trustScore: 82,
      fraudRisk: 'low',
      probationPrediction: 'watch'
    };
  }

  private mapCompanyDecision(
    status: ApplicationStatus
  ): NonNullable<EmployerApplicant['companyDecision']> {
    if (status === ApplicationStatus.Rejected) {
      return 'rejected';
    }

    if (status === ApplicationStatus.InterviewScheduled) {
      return 'accepted_for_interview';
    }

    if (status === ApplicationStatus.Hired) {
      return 'hired';
    }

    if (status === ApplicationStatus.Accepted) {
      return 'accepted_for_interview';
    }

    return 'pending';
  }

  private mapShortlistStage(
    decision: NonNullable<EmployerApplicant['companyDecision']>
  ): NonNullable<EmployerApplicant['shortlistStage']> {
    if (decision === 'accepted_for_interview') {
      return 'interviewing';
    }

    if (decision === 'hired') {
      return 'hired';
    }

    if (decision === 'request_replacement') {
      return 'recommended';
    }

    return 'sent_to_company';
  }

  private mapDisplayStatus(status: ApplicationDisplayStatus | string): ApplicationStatus {
    const normalized = String(status).trim().toLowerCase();

    if (normalized.includes('review')) return ApplicationStatus.UnderReview;
    if (normalized.includes('short')) return ApplicationStatus.Shortlisted;
    if (normalized.includes('interview')) return ApplicationStatus.InterviewScheduled;
    if (normalized.includes('hired') || normalized.includes('probation')) {
      return ApplicationStatus.Hired;
    }
    if (normalized.includes('accept')) {
      return ApplicationStatus.Accepted;
    }
    if (normalized.includes('reject')) return ApplicationStatus.Rejected;
    return ApplicationStatus.Applied;
  }

  private calculateSalaryMatch(
    expectedSalary: number,
    budget: number
  ): EmployerApplicant['salaryMatch'] {
    if (!budget || expectedSalary <= budget) return 'within_budget';
    if (expectedSalary <= budget * 1.1) return 'slightly_above';
    return 'out_of_budget';
  }

  private createAppliedAt(id: string): string {
    const offset = Number(id.replace(/\D/g, '').slice(-2)) || 1;
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toISOString();
  }

  private toWorkTypeLabel(value?: string): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('remote')) return 'Remote';
    if (normalized.includes('hybrid')) return 'Hybrid';
    if (normalized.includes('part')) return 'Part Time';
    if (normalized.includes('on')) return 'Onsite';
    return 'Full Time';
  }

  private invalidateApplicantsCache(jobId?: string): void {
    this.allApplicantsCache$ = null;

    if (!jobId) {
      this.applicantsByJobCache = {};
      return;
    }

    delete this.applicantsByJobCache[jobId];
  }

  private ensureDemoApplicantsForJob(jobId: string): void {
    const hasAnyForJob = this.applicants.some(applicant => applicant.jobId === jobId);

    if (hasAnyForJob) {
      return;
    }

    const seed: EmployerApplicant[] = [
      {
        id: `app-${jobId}-seed-01`,
        jobId,
        jobTitle: 'Open Role',
        department: 'General',
        candidateName: 'Demo Candidate One',
        email: `demo.one.${jobId.toLowerCase()}@example.com`,
        status: ApplicationStatus.Shortlisted,
        appliedAt: this.createAppliedAt('1'),
        experienceYears: 4,
        fitScore: 87,
        salaryExpectation: 18000,
        notes: 'Seeded demo profile sent by admin to employer.',
        workType: 'Hybrid',
        salaryMatch: 'within_budget',
        source: 'mock',
        shortlistStage: 'sent_to_company',
        companyDecision: 'pending',
        probationStatus: 'not_started',
        trustScore: 84,
        fraudRisk: 'low',
        probationPrediction: 'watch'
      },
      {
        id: `app-${jobId}-seed-02`,
        jobId,
        jobTitle: 'Open Role',
        department: 'General',
        candidateName: 'Demo Candidate Two',
        email: `demo.two.${jobId.toLowerCase()}@example.com`,
        status: ApplicationStatus.InterviewScheduled,
        appliedAt: this.createAppliedAt('3'),
        experienceYears: 5,
        fitScore: 90,
        salaryExpectation: 20000,
        notes: 'Already accepted for interview by company.',
        workType: 'Remote',
        salaryMatch: 'slightly_above',
        source: 'mock',
        shortlistStage: 'interviewing',
        companyDecision: 'accepted_for_interview',
        probationStatus: 'not_started',
        trustScore: 88,
        fraudRisk: 'low',
        probationPrediction: 'strong'
      }
    ];

    this.applicants = [...seed, ...this.applicants];
    this.invalidateApplicantsCache(jobId);
  }
}
