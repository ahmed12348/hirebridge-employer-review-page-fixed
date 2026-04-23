import { InterviewStatus } from '../enums/interview-status.enum';

export type InterviewType = 'Online' | 'Onsite' | 'Phone';
export type InterviewOutcome = 'pending' | 'passed' | 'failed';

export interface ScheduledInterview {
  id: string;
  applicantId: string;
  jobId: string;
  candidateName: string;
  date: string;
  time: string;
  type: InterviewType;
  status: InterviewStatus;
  interviewerName?: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
  outcome?: InterviewOutcome;
  outcomeNotes?: string;
  outcomeRecordedAt?: string;
  probationStarted?: boolean;
  source?: 'mock' | 'api';
}
