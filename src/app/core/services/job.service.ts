import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';

import { ApplicationsService } from './applications.service';
import { EmployerJob, EmployerJobsService } from './employer-jobs.service';

export interface CandidateJob {
  id: string;
  title: string;
  companyName: string;
  location: string;
  workType: string;
  category: string;
  description: string;
  experienceLevel: string;
  salary: number;
  matchScore: number;
  status: 'active' | 'applied';
  applied: boolean;
  source?: 'local' | 'mock' | 'api';
}

const INITIAL_CANDIDATE_JOBS: CandidateJob[] = [
  {
    id: 'JOB-1001',
    title: 'Senior Frontend Engineer',
    companyName: 'TechCorp',
    location: 'Cairo',
    workType: 'Hybrid',
    category: 'Engineering',
    description: 'Own frontend architecture and ship scalable Angular modules.',
    experienceLevel: 'Senior',
    salary: 32000,
    matchScore: 91,
    status: 'active',
    applied: false,
    source: 'mock'
  },
  {
    id: 'JOB-1002',
    title: 'HR Business Partner',
    companyName: 'FinCo',
    location: 'Alexandria',
    workType: 'Onsite',
    category: 'Human Resources',
    description: 'Drive recruitment strategy and stakeholder alignment.',
    experienceLevel: 'Mid',
    salary: 24000,
    matchScore: 84,
    status: 'active',
    applied: false,
    source: 'mock'
  },
  {
    id: 'JOB-1003',
    title: 'Sales Team Lead',
    companyName: 'RetailInc',
    location: 'Giza',
    workType: 'Hybrid',
    category: 'Sales',
    description: 'Lead a B2B sales pod and optimize pipeline performance.',
    experienceLevel: 'Senior',
    salary: 28000,
    matchScore: 87,
    status: 'active',
    applied: false,
    source: 'mock'
  },
  {
    id: 'JOB-1004',
    title: 'Backend Engineer',
    companyName: 'CloudOps',
    location: 'Remote',
    workType: 'Remote',
    category: 'Engineering',
    description: 'Build and maintain API services with Node.js and PostgreSQL.',
    experienceLevel: 'Mid',
    salary: 30000,
    matchScore: 89,
    status: 'active',
    applied: false,
    source: 'mock'
  }
];

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private readonly baseUrl = 'http://localhost:3004';
  private readonly jobsSubject = new BehaviorSubject<CandidateJob[]>(INITIAL_CANDIDATE_JOBS);
  private hasStartedRefresh = false;

  constructor(
    private http: HttpClient,
    private employerJobsService: EmployerJobsService,
    private applicationsService: ApplicationsService
  ) {}

  getCandidateJobMatches(): Observable<CandidateJob[]> {
    this.ensureJobsLoaded();
    return this.jobsSubject.asObservable();
  }

  applyToJob(jobId: string): Observable<{ jobId: string; status: 'applied'; message: string }> {
    if (!jobId) {
      return throwError(() => new Error('Job id is required.'));
    }

    return this.applicationsService.applyToJob(jobId).pipe(
      map(application => ({
        jobId: application.jobId,
        status: 'applied' as const,
        message: 'Application submitted successfully.'
      })),
      map(result => {
        this.jobsSubject.next(
          this.jobsSubject.value.map(job =>
            job.id === jobId ? { ...job, applied: true, status: 'applied' } : job
          )
        );
        return result;
      })
    );
  }

  private ensureJobsLoaded(): void {
    if (this.hasStartedRefresh) {
      return;
    }

    this.hasStartedRefresh = true;

    this.fetchPublicJobs().pipe(
      catchError(() =>
        this.employerJobsService.getJobs().pipe(
          map(jobs => jobs.map(job => this.mapEmployerJobToCandidateJob(job))),
          catchError(() => of(this.jobsSubject.value))
        )
      )
    ).subscribe(jobs => {
      if (!jobs.length) {
        return;
      }

      this.jobsSubject.next(this.attachAppliedState(jobs));
    });
  }

  private fetchPublicJobs(): Observable<CandidateJob[]> {
    return this.http.get<unknown>(`${this.baseUrl}/job/getAllJobs`).pipe(
      map(response => this.normalizePublicJobsResponse(response))
    );
  }

  private normalizePublicJobsResponse(response: unknown): CandidateJob[] {
    const list = this.extractJobsList(response);

    if (!list.length) {
      return [];
    }

    return list.map(item => this.mapApiJobToCandidateJob(item));
  }

  private extractJobsList(response: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(response)) {
      return response as Array<Record<string, unknown>>;
    }

    const root = this.asRecord(response);
    const data = this.asRecord(root?.['data']);

    if (Array.isArray(root?.['jobs'])) {
      return root['jobs'] as Array<Record<string, unknown>>;
    }

    if (Array.isArray(data?.['jobs'])) {
      return data['jobs'] as Array<Record<string, unknown>>;
    }

    if (Array.isArray(root?.['data'])) {
      return root['data'] as Array<Record<string, unknown>>;
    }

    return [];
  }

  private mapApiJobToCandidateJob(item: Record<string, unknown>): CandidateJob {
    const id = this.asString(item['_id']) || this.asString(item['id']) || `job-${Date.now()}`;
    const title = this.asString(item['title']) || 'Job opening';
    const workType = this.asString(item['workType']) || this.asString(item['type']) || 'Remote';
    const budget = this.asRecord(item['budget']);
    const salary = Number(item['salary'] || budget?.['max'] || budget?.['min'] || 0);
    const company = this.asRecord(item['company']) || this.asRecord(item['companyId']);

    return {
      id,
      title,
      companyName:
        this.asString(item['companyName']) ||
        this.asString(company?.['name']) ||
        'HireBridge Partner',
      location: this.asString(item['location']) || this.resolveLocation(workType),
      workType,
      category: this.asString(item['category']) || this.asString(item['department']) || 'General',
      description: this.asString(item['description']) || '',
      experienceLevel: this.asString(item['experienceLevel']) || 'Mid',
      salary,
      matchScore: Number(item['matchScore'] || 78),
      status: 'active',
      applied: false,
      source: 'api'
    };
  }

  private attachAppliedState(jobs: CandidateJob[]): CandidateJob[] {
    return jobs.map(job => {
      const applied = this.applicationsService.hasAppliedToJob(job.id);
      return {
        ...job,
        applied,
        status: applied ? 'applied' : 'active'
      };
    });
  }

  private mapEmployerJobToCandidateJob(job: EmployerJob): CandidateJob {
    const isApplied = this.applicationsService.hasAppliedToJob(job.id);

    return {
      id: job.id,
      title: job.title,
      companyName: 'HireBridge Partner',
      location: job.location,
      workType: job.type,
      category: job.category,
      description: job.description,
      experienceLevel: job.experienceLevel,
      salary: job.salary,
      matchScore: job.applicantsCount ? Math.min(95, 70 + job.applicantsCount) : 78,
      status: isApplied ? 'applied' : 'active',
      applied: isApplied,
      source: 'mock'
    };
  }

  private resolveLocation(workType: string): string {
    const normalized = String(workType || '').trim().toLowerCase();
    if (normalized.includes('remote')) {
      return 'Remote';
    }

    if (normalized.includes('hybrid')) {
      return 'Hybrid';
    }

    return 'Onsite';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private asString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }
}
