export enum InterviewStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Rescheduled = 'rescheduled'
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  [InterviewStatus.Scheduled]: 'Scheduled',
  [InterviewStatus.Completed]: 'Completed',
  [InterviewStatus.Cancelled]: 'Cancelled',
  [InterviewStatus.Rescheduled]: 'Rescheduled'
};
