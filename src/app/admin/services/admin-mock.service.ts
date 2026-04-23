import { Injectable, signal } from '@angular/core';
import { ApplicationsService } from '../../core/services/applications.service';
import { EmployerApplicationsService } from '../../core/services/employer-applications.service';

export interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'Open' | 'Closed' | 'In Review';
  requestedAt: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite';
  budget: number;
  openRoles: number;
  minExperience: string;
  skills: string[];
}

export interface AdminCandidate {
  id: string;
  name: string;
  role: string;
  experience: string;
  status: 'Screening' | 'Interviewing' | 'Shortlisted';
  expectedSalary: number;
  fitScore: number;
  cvSummary: string;
}

export interface SentCandidate extends AdminCandidate {
  jobId: string;
  sentAt: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  industry: string;
  openRoles: number;
}

export interface AdminInterview {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  companyName: string;
  role: string;
  date: string;
  status: 'Scheduled' | 'Completed' | 'Pending';
}

export type SendCandidateResult = 'sent' | 'already-sent' | 'not-found';
export type RevokeCandidateResult = 'revoked' | 'not-found';

@Injectable({
  providedIn: 'root'
})
export class AdminMockService {
  private readonly jobs: AdminJob[] = [
    {
      id: 'JOB-1001',
      title: 'Senior Frontend Engineer',
      company: 'TechCorp',
      location: 'Cairo',
      status: 'Open',
      requestedAt: '2026-04-14',
      workType: 'Hybrid',
      budget: 32000,
      openRoles: 2,
      minExperience: '5+',
      skills: ['Angular', 'TypeScript', 'RxJS', 'REST APIs']
    },
    {
      id: 'JOB-1002',
      title: 'HR Business Partner',
      company: 'FinCo',
      location: 'Alexandria',
      status: 'In Review',
      requestedAt: '2026-04-12',
      workType: 'Onsite',
      budget: 24000,
      openRoles: 1,
      minExperience: '4+',
      skills: ['Recruitment', 'Stakeholder Management', 'HR Analytics']
    },
    {
      id: 'JOB-1003',
      title: 'Sales Team Lead',
      company: 'RetailInc',
      location: 'Giza',
      status: 'Open',
      requestedAt: '2026-04-10',
      workType: 'Hybrid',
      budget: 28000,
      openRoles: 2,
      minExperience: '6+',
      skills: ['B2B Sales', 'Pipeline Management', 'Leadership']
    },
    {
      id: 'JOB-1004',
      title: 'Backend Engineer',
      company: 'CloudOps',
      location: 'Cairo',
      status: 'Closed',
      requestedAt: '2026-04-08',
      workType: 'Remote',
      budget: 30000,
      openRoles: 1,
      minExperience: '4+',
      skills: ['Node.js', 'PostgreSQL', 'Docker', 'System Design']
    }
  ];

  private readonly candidates: AdminCandidate[] = [
    {
      id: 'CAN-301',
      name: 'Omar Ali',
      role: 'Senior Frontend Engineer',
      experience: '6 years',
      status: 'Interviewing',
      expectedSalary: 30000,
      fitScore: 93,
      cvSummary: 'Strong Angular lead with enterprise dashboard experience and mentoring background.'
    },
    {
      id: 'CAN-302',
      name: 'Sara Ahmed',
      role: 'HR Business Partner',
      experience: '5 years',
      status: 'Screening',
      expectedSalary: 23000,
      fitScore: 89,
      cvSummary: 'Experienced HRBP with recruitment operations and policy implementation expertise.'
    },
    {
      id: 'CAN-303',
      name: 'Karim Hassan',
      role: 'Sales Team Lead',
      experience: '8 years',
      status: 'Shortlisted',
      expectedSalary: 27000,
      fitScore: 91,
      cvSummary: 'Proven sales leader with strong record in scaling B2B sales teams.'
    },
    {
      id: 'CAN-304',
      name: 'Nour Samir',
      role: 'Backend Engineer',
      experience: '4 years',
      status: 'Interviewing',
      expectedSalary: 29500,
      fitScore: 86,
      cvSummary: 'Backend engineer focused on distributed APIs, CI/CD, and cloud-native services.'
    },
    {
      id: 'CAN-305',
      name: 'Mona Adel',
      role: 'Senior Frontend Engineer',
      experience: '7 years',
      status: 'Shortlisted',
      expectedSalary: 31500,
      fitScore: 95,
      cvSummary: 'Frontend architect with deep Angular, design system, and performance optimization expertise.'
    }
  ];

  private readonly companies: AdminCompany[] = [
    { id: 'COM-01', name: 'TechCorp', industry: 'Technology', openRoles: 3 },
    { id: 'COM-02', name: 'FinCo', industry: 'Finance', openRoles: 2 },
    { id: 'COM-03', name: 'RetailInc', industry: 'Retail', openRoles: 1 },
    { id: 'COM-04', name: 'CloudOps', industry: 'SaaS', openRoles: 2 }
  ];

  private readonly interviews: AdminInterview[] = [
    {
      id: 'INT-5001',
      jobId: 'JOB-1001',
      candidateId: 'CAN-301',
      candidateName: 'Omar Ali',
      companyName: 'TechCorp',
      role: 'Senior Frontend Engineer',
      date: '2026-04-21 11:00',
      status: 'Scheduled'
    },
    {
      id: 'INT-5002',
      jobId: 'JOB-1002',
      candidateId: 'CAN-302',
      candidateName: 'Sara Ahmed',
      companyName: 'FinCo',
      role: 'HR Business Partner',
      date: '2026-04-22 13:30',
      status: 'Pending'
    },
    {
      id: 'INT-5003',
      jobId: 'JOB-1003',
      candidateId: 'CAN-303',
      candidateName: 'Karim Hassan',
      companyName: 'RetailInc',
      role: 'Sales Team Lead',
      date: '2026-04-20 09:00',
      status: 'Completed'
    }
  ];

  private readonly sentCandidatesState = signal<SentCandidate[]>([]);
  private readonly interviewsState = signal<AdminInterview[]>(this.interviews);

  constructor(
    private applicationsService: ApplicationsService,
    private employerApplicationsService: EmployerApplicationsService
  ) {}

  getJobs(): AdminJob[] {
    return this.jobs;
  }

  getUpcomingJobs(): AdminJob[] {
    return this.jobs.filter(job => job.status === 'Open' || job.status === 'In Review');
  }

  getJobById(jobId: string): AdminJob | null {
    return this.jobs.find(job => job.id === jobId) || null;
  }

  getCandidates(): AdminCandidate[] {
    return this.candidates;
  }

  getMatchingCandidates(jobId: string): AdminCandidate[] {
    const job = this.getJobById(jobId);
    if (!job) {
      return [];
    }

    return this.candidates
      .filter(candidate => candidate.role === job.title)
      .sort((a, b) => b.fitScore - a.fitScore);
  }

  getSentCandidates(jobId: string): SentCandidate[] {
    return this.sentCandidatesState().filter(candidate => candidate.jobId === jobId);
  }

  sendCandidate(jobId: string, candidateId: string): SendCandidateResult {
    const job = this.getJobById(jobId);
    const candidate = this.candidates.find(item => item.id === candidateId);

    if (!job || !candidate) {
      return 'not-found';
    }

    const alreadySent = this.sentCandidatesState().some(
      item => item.jobId === jobId && item.id === candidateId
    );

    if (alreadySent) {
      return 'already-sent';
    }

    const sentCandidate: SentCandidate = {
      ...candidate,
      jobId,
      sentAt: new Date().toISOString()
    };

    this.sentCandidatesState.update(current => [sentCandidate, ...current]);

    this.applicationsService.addApplicationFromAdmin({
      applicantId: candidate.id,
      jobId,
      jobTitle: job.title,
      companyName: job.company,
      fitScore: candidate.fitScore
    });

    this.employerApplicationsService.addOrUpdateFromAdminSend({
      applicantId: candidate.id,
      jobId,
      jobTitle: job.title,
      candidateName: candidate.name,
      expectedSalary: candidate.expectedSalary,
      fitScore: candidate.fitScore,
      experience: candidate.experience
    });

    const hasInterview = this.interviewsState().some(
      interview => interview.jobId === jobId && interview.candidateId === candidateId
    );

    if (!hasInterview) {
      const newInterview: AdminInterview = {
        id: `INT-${Math.floor(Math.random() * 9000) + 1000}`,
        jobId,
        candidateId,
        candidateName: candidate.name,
        companyName: job.company,
        role: job.title,
        date: this.createInterviewDate(),
        status: 'Pending'
      };

      this.interviewsState.update(current => [newInterview, ...current]);
    }

    return 'sent';
  }

  revokeCandidate(jobId: string, candidateId: string): RevokeCandidateResult {
    const exists = this.sentCandidatesState().some(
      candidate => candidate.jobId === jobId && candidate.id === candidateId
    );

    if (!exists) {
      return 'not-found';
    }

    this.sentCandidatesState.update(current =>
      current.filter(candidate => !(candidate.jobId === jobId && candidate.id === candidateId))
    );

    this.interviewsState.update(current =>
      current.filter(
        interview =>
          !(interview.jobId === jobId && interview.candidateId === candidateId && interview.status === 'Pending')
      )
    );

    return 'revoked';
  }

  getCompanies(): AdminCompany[] {
    return this.companies;
  }

  getInterviews(): AdminInterview[] {
    return this.interviewsState();
  }

  addJobFromEmployer(job: {
    id: string;
    title: string;
    location: string;
    workType: string;
    budget: number;
    openRoles: number;
    minExperience: string;
    skills: string[];
    company?: string;
  }): void {
    if (this.jobs.some(item => item.id === job.id)) {
      return;
    }

    const companyName =
      job.company ||
      this.resolveCompanyNameFromAccess() ||
      'Employer Company';

    this.jobs.unshift({
      id: job.id,
      title: job.title,
      company: companyName,
      location: job.location || 'Cairo',
      status: 'Open',
      requestedAt: new Date().toISOString().slice(0, 10),
      workType: this.normalizeWorkType(job.workType),
      budget: Number(job.budget || 0),
      openRoles: Number(job.openRoles || 1),
      minExperience: job.minExperience || '3+',
      skills: Array.isArray(job.skills) ? job.skills : []
    });
  }

  private normalizeWorkType(value: string): 'Remote' | 'Hybrid' | 'Onsite' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('remote')) return 'Remote';
    if (normalized.includes('hybrid')) return 'Hybrid';
    return 'Onsite';
  }

  private resolveCompanyNameFromAccess(): string {
    try {
      const raw = localStorage.getItem('companyAccess');
      if (!raw) {
        return '';
      }

      const parsed = JSON.parse(raw);
      const email = String(parsed?.companyEmail || '').trim();
      if (!email.includes('@')) {
        return '';
      }

      const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
    } catch {
      return '';
    }
  }

  private createInterviewDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 11:00`;
  }
}
