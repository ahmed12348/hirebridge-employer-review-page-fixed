import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { switchMap, distinctUntilChanged } from 'rxjs/operators';

import {
  EmployerApplicant,
  EmployerApplicationsService
} from '../../../core/services/employer-applications.service';
import { InterviewSchedulingService } from '../../../core/services/interview-scheduling.service';
import { EmployerJob, EmployerJobsService } from '../../../core/services/employer-jobs.service';
import { ApplicationStatus } from '../../../shared/enums/application-status.enum';
import { InterviewStatus } from '../../../shared/enums/interview-status.enum';
import { ScheduledInterview } from '../../../shared/models/interview.model';

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
  standalone: true,
  selector: 'app-employer-dashboard-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css']
})
export class EmployerDashboardPageComponent implements OnInit {
  loading = true;
  error = '';
  stats: DashboardStat[] = [];
  jobs: EmployerJob[] = [];
  applicants: EmployerApplicant[] = [];
  featuredJobs: EmployerJob[] = [];
  upcomingInterviews: ScheduledInterview[] = [];
  activity: ActivityItem[] = [];
  interviewsByJob: Record<string, number> = {};

  constructor(
    private router: Router,
    private jobsService: EmployerJobsService,
    private interviewSchedulingService: InterviewSchedulingService,
    private employerApplicationsService: EmployerApplicationsService
  ) {}

  ngOnInit(): void {
    // First ensure company ID is fetched and cached, then load all data
    this.jobsService.getOrFetchCompanyId().pipe(
      switchMap(() => 
        combineLatest([
          this.jobsService.getJobs(),
          this.interviewSchedulingService.getAllInterviews(),
          this.employerApplicationsService.getAllApplicants()
        ])
      ),
      distinctUntilChanged() // Only process when data actually changes
    ).subscribe({
      next: ([jobs, interviews, applicants]) => {
        this.jobs = jobs;
        this.applicants = applicants;
        this.interviewsByJob = this.buildInterviewsByJob(interviews);
        this.featuredJobs = [...jobs]
          .sort((a, b) => (this.getMatchedCandidatesForJob(b.id) - this.getMatchedCandidatesForJob(a.id)))
          .slice(0, 4);
        this.upcomingInterviews = [...interviews]
          .filter(
            interview =>
              interview.status === InterviewStatus.Scheduled ||
              interview.status === InterviewStatus.Rescheduled
          )
          .sort(
            (a, b) =>
              new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
          )
          .slice(0, 5);
        this.stats = this.buildStats(jobs, interviews, applicants);
        this.activity = this.buildActivity(jobs, interviews, applicants);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load employer dashboard.';
      }
    });
  }

  get activeRequestsCount(): number {
    return this.jobs.length;
  }

  get candidatesSentCount(): number {
    return this.applicants.filter(applicant => applicant.shortlistStage !== 'recommended').length;
  }

  get positionsFilledCount(): number {
    return this.applicants.filter(applicant => applicant.companyDecision === 'hired').length;
  }

  get remainingHeadcount(): number {
    return Math.max(
      this.jobs.reduce((sum, job) => sum + job.openRoles, 0) - this.positionsFilledCount,
      0
    );
  }

  getPriorityLabel(priority?: string): string {
    return priority ? `${priority} priority` : 'Recruitment pipeline';
  }

  getInterviewCountForJob(jobId: string): number {
    return this.interviewsByJob[jobId] || 0;
  }

  getJobTitle(jobId: string): string {
    return this.jobs.find(job => job.id === jobId)?.title || 'Open role';
  }

  getMatchedCandidatesForJob(jobId: string): number {
    return this.applicants.filter(applicant => applicant.jobId === jobId).length;
  }

  getHiredForJob(jobId: string): number {
    return this.applicants.filter(applicant => applicant.jobId === jobId && applicant.companyDecision === 'hired').length;
  }

  openJobDetails(jobId: string): void {
    this.router.navigate(['/employer/jobs', jobId]);
  }

  private buildStats(
    jobs: EmployerJob[],
    interviews: ScheduledInterview[],
    applicants: EmployerApplicant[]
  ): DashboardStat[] {
    const sentToCompany = applicants.filter(applicant => applicant.shortlistStage !== 'recommended').length;
    const scheduledInterviews = interviews.filter(
      interview =>
        interview.status === InterviewStatus.Scheduled ||
        interview.status === InterviewStatus.Rescheduled
    ).length;
    const filled = applicants.filter(applicant => applicant.companyDecision === 'hired').length;
    const headcount = jobs.reduce((sum, job) => sum + job.openRoles, 0);

    return [
      {
        label: 'Active Requests',
        value: jobs.length,
        helper: 'Hiring requests currently moving with HireBridge',
        tone: 'blue'
      },
      {
        label: 'Candidates Sent',
        value: sentToCompany,
        helper: 'Recommended profiles already shared with the company',
        tone: 'slate'
      },
      {
        label: 'Interviews In Progress',
        value: scheduledInterviews,
        helper: 'Upcoming or rescheduled interviews being coordinated',
        tone: 'violet'
      },
      {
        label: 'Positions Filled',
        value: filled,
        helper: `${Math.max(headcount - filled, 0)} positions still open across all requests`,
        tone: 'green'
      }
    ];
  }

  private buildActivity(
    jobs: EmployerJob[],
    interviews: ScheduledInterview[],
    applicants: EmployerApplicant[]
  ): ActivityItem[] {
    const jobItems = jobs.slice(0, 2).map(job => ({
      title: `${job.title} request is active`,
      detail: `${this.getMatchedCandidatesForJob(job.id)} matched candidates • ${job.openRoles} requested headcount`,
      time: job.deadline ? `Client deadline ${job.deadline}` : 'Recently updated',
      tone: 'blue' as const
    }));

    const interviewItems: ActivityItem[] = interviews.slice(0, 2).map(interview => ({
      title: `${interview.candidateName} interview for ${this.getJobTitle(interview.jobId)}`,
      detail: `${interview.type} • ${interview.interviewerName || 'Hiring team'}`,
      time: `${interview.date} ${interview.time}`,
      tone: interview.status === InterviewStatus.Completed ? 'green' as const : 'amber' as const
    }));

    const decisionItems: ActivityItem[] = applicants
      .filter(applicant => applicant.companyDecision && applicant.companyDecision !== 'pending')
      .slice(0, 1)
      .map(applicant => ({
        title: `${applicant.candidateName} moved to ${applicant.companyDecision?.replace(/_/g, ' ')}`,
        detail: `${applicant.jobTitle} • fit score ${applicant.fitScore || 0}%`,
        time: 'Latest company feedback',
        tone: applicant.companyDecision === 'hired' ? 'green' as const : 'amber' as const
      }));

    return [...jobItems, ...interviewItems, ...decisionItems].slice(0, 5);
  }

  private buildInterviewsByJob(interviews: ScheduledInterview[]): Record<string, number> {
    return interviews.reduce((acc, interview) => {
      acc[interview.jobId] = (acc[interview.jobId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
