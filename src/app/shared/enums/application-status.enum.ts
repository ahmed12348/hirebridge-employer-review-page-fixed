export enum ApplicationStatus {
  Applied = 'applied',
  UnderReview = 'under_review',
  Shortlisted = 'shortlisted',
  InterviewScheduled = 'interview_scheduled',
  Accepted = 'accepted',
  Hired = 'hired',
  Rejected = 'rejected'
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Applied]: 'Applied',
  [ApplicationStatus.UnderReview]: 'Under Review',
  [ApplicationStatus.Shortlisted]: 'Shortlisted',
  [ApplicationStatus.InterviewScheduled]: 'Interview Scheduled',
  [ApplicationStatus.Accepted]: 'Accepted',
  [ApplicationStatus.Hired]: 'Hired',
  [ApplicationStatus.Rejected]: 'Rejected'
};
