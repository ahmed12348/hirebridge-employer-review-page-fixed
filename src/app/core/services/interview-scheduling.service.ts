import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, shareReplay, startWith, switchMap } from 'rxjs/operators';

import { InterviewStatus } from '../../shared/enums/interview-status.enum';
import { InterviewOutcome, InterviewType, ScheduledInterview } from '../../shared/models/interview.model';
import { EmployerApplicationsService } from './employer-applications.service';

export interface ScheduleInterviewPayload {
  applicantId: string;
  jobId: string;
  candidateName: string;
  date: string;
  time: string;
  type: InterviewType;
  interviewerName?: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewSchedulingService {
  private interviews: ScheduledInterview[] = this.buildInitialInterviews();
  private allInterviewsCache$: Observable<ScheduledInterview[]> | null = null;
  private interviewsByJobCache: Record<string, Observable<ScheduledInterview[]>> = {};

  constructor(private employerApplicationsService: EmployerApplicationsService) {}

  getAllInterviews(): Observable<ScheduledInterview[]> {
    if (!this.allInterviewsCache$) {
      this.allInterviewsCache$ = of([...this.interviews]).pipe(shareReplay(1));
    }

    return this.allInterviewsCache$;
  }

  getInterviewsByJob(jobId: string): Observable<ScheduledInterview[]> {
    if (!this.interviewsByJobCache[jobId]) {
      const cached = this.interviews.filter(item => item.jobId === jobId);
      this.interviewsByJobCache[jobId] = of(this.interviews.filter(item => item.jobId === jobId)).pipe(
        startWith(cached), // Return cached interviews immediately
        shareReplay(1)
      );
    }
    return this.interviewsByJobCache[jobId];
  }

  scheduleInterview(payload: ScheduleInterviewPayload): Observable<ScheduledInterview> {
    const existing = this.interviews.find(item => item.applicantId === payload.applicantId);
    const interview: ScheduledInterview = {
      id: existing?.id || `int-${Date.now()}`,
      ...payload,
      status: existing ? InterviewStatus.Rescheduled : InterviewStatus.Scheduled,
      outcome: existing?.outcome || 'pending',
      probationStarted: existing?.probationStarted || false,
      source: 'mock'
    };

    this.interviews = [interview, ...this.interviews.filter(item => item.applicantId !== payload.applicantId)];
    this.invalidateCache(interview.jobId);
    return of(interview);
  }

  updateInterviewStatus(interviewId: string, status: InterviewStatus): Observable<ScheduledInterview> {
    const interview = this.interviews.find(item => item.id === interviewId);

    if (!interview) {
      return throwError(() => new Error('Interview not found.'));
    }

    interview.status = status;

    if (status === InterviewStatus.Completed && !interview.outcome) {
      interview.outcome = 'pending';
      interview.outcomeRecordedAt = new Date().toISOString();
    }

    this.invalidateCache(interview.jobId);
    return of({ ...interview });
  }

  cancelInterview(interviewId: string): Observable<ScheduledInterview> {
    return this.updateInterviewStatus(interviewId, InterviewStatus.Cancelled);
  }

  completeInterview(interviewId: string): Observable<ScheduledInterview> {
    return this.updateInterviewStatus(interviewId, InterviewStatus.Completed);
  }

  recordInterviewOutcome(
    interviewId: string,
    outcome: InterviewOutcome,
    notes?: string
  ): Observable<ScheduledInterview> {
    const interview = this.interviews.find(item => item.id === interviewId);

    if (!interview) {
      return throwError(() => new Error('Interview not found.'));
    }

    interview.status = InterviewStatus.Completed;
    interview.outcome = outcome;
    interview.outcomeNotes = notes || interview.outcomeNotes;
    interview.outcomeRecordedAt = new Date().toISOString();
    interview.probationStarted = outcome === 'passed';

    let decisionFlow$: Observable<unknown> = of(null);

    if (outcome === 'passed') {
      decisionFlow$ = this.employerApplicationsService.updateCompanyDecision(
        interview.applicantId,
        'hired'
      );
    } else if (outcome === 'failed') {
      decisionFlow$ = this.employerApplicationsService.updateCompanyDecision(
        interview.applicantId,
        'rejected'
      );
    }

    return decisionFlow$.pipe(
      switchMap(() => this.updateCompanyDecisionIfPending(outcome, interview.applicantId)),
      map(() => {
        this.invalidateCache(interview.jobId);
        return { ...interview };
      })
    );
  }

  private updateCompanyDecisionIfPending(
    outcome: InterviewOutcome,
    applicantId: string
  ): Observable<unknown> {
    if (outcome !== 'pending') {
      return of(null);
    }

    return this.employerApplicationsService.updateCompanyDecision(applicantId, 'accepted_for_interview');
  }

  private invalidateCache(jobId?: string): void {
    this.allInterviewsCache$ = null;

    if (!jobId) {
      this.interviewsByJobCache = {};
      return;
    }

    delete this.interviewsByJobCache[jobId];
  }

  private buildInitialInterviews(): ScheduledInterview[] {
    const nextDate = (days: number): string => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };

    return [
      {
        id: 'int-demo-1001-01',
        applicantId: 'app-demo-job1001-02',
        jobId: 'JOB-1001',
        candidateName: 'Youssef Tarek',
        date: nextDate(1),
        time: '12:00',
        type: 'Online',
        status: InterviewStatus.Scheduled,
        interviewerName: 'Maha Salem',
        meetingLink: 'https://meet.example.com/hirebridge-frontend-01',
        notes: 'Technical interview with frontend lead.',
        outcome: 'pending',
        probationStarted: false,
        source: 'mock'
      },
      {
        id: 'int-demo-1002-01',
        applicantId: 'app-demo-job1002-01',
        jobId: 'JOB-1002',
        candidateName: 'Mariam Adel',
        date: nextDate(-2),
        time: '10:30',
        type: 'Onsite',
        status: InterviewStatus.Completed,
        interviewerName: 'Ahmed Nabil',
        location: 'HQ - New Cairo',
        notes: 'Behavioral and stakeholder interview.',
        outcome: 'passed',
        outcomeNotes: 'Strong fit with hiring panel. Probation started.',
        outcomeRecordedAt: new Date().toISOString(),
        probationStarted: true,
        source: 'mock'
      }
    ];
  }
}
