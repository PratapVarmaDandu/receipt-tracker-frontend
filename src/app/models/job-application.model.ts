export type JobApplicationStatus =
  'APPLIED' | 'PHONE_SCREEN' | 'TECHNICAL' | 'ONSITE' | 'OFFER' | 'REJECTED' | 'WITHDRAWN' | 'GHOSTED';

export type InterviewFormat = 'PHONE' | 'VIDEO' | 'ONSITE' | 'TAKE_HOME';
export type InterviewOutcome = 'PENDING' | 'PASSED' | 'FAILED' | 'CANCELLED';

export interface InterviewRound {
  id: number;
  jobApplicationId: number;
  roundName: string;
  scheduledAt: string | null;
  format: InterviewFormat | null;
  interviewerName: string | null;
  outcome: InterviewOutcome;
  notes: string | null;
  createdAt: string;
}

export interface JobApplication {
  id: number;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  salaryRange: string | null;
  status: JobApplicationStatus;
  appliedDate: string;
  followUpDate: string | null;
  hrName: string | null;
  hrEmail: string | null;
  hrPhone: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  portalUsername: string | null;
  portalPassword: string | null;
  emailConfirmationReceived: boolean;
  jobDescription: string | null;
  prepNotes: string | null;
  notes: string | null;
  resumeDocumentId: number | null;
  resumeVersion: string | null;
  resumeDocumentTitle: string | null;
  interviewRounds: InterviewRound[];
  createdAt: string;
  updatedAt: string;
  nextInterviewAt: string | null;
  followUpDue: boolean;
}

export interface JobApplicationSummary {
  total: number;
  active: number;
  thisMonth: number;
  followUpsDue: number;
  offersReceived: number;
  upcomingInterviews: number;
  byStatus: Record<JobApplicationStatus, number>;
}

// ── Display metadata ────────────────────────────────────────────────────────

export const KANBAN_COLUMNS: JobApplicationStatus[] = [
  'APPLIED', 'PHONE_SCREEN', 'TECHNICAL', 'ONSITE', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'
];

export const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  APPLIED:      'Applied',
  PHONE_SCREEN: 'Phone Screen',
  TECHNICAL:    'Technical',
  ONSITE:       'On-site',
  OFFER:        'Offer',
  REJECTED:     'Rejected',
  WITHDRAWN:    'Withdrawn',
  GHOSTED:      'Ghosted'
};

export const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  APPLIED:      '#3b82f6',
  PHONE_SCREEN: '#8b5cf6',
  TECHNICAL:    '#6366f1',
  ONSITE:       '#0ea5e9',
  OFFER:        '#22c55e',
  REJECTED:     '#ef4444',
  WITHDRAWN:    '#6b7280',
  GHOSTED:      '#f59e0b'
};

export const STATUS_LIGHT_COLORS: Record<JobApplicationStatus, string> = {
  APPLIED:      '#eff6ff',
  PHONE_SCREEN: '#f5f3ff',
  TECHNICAL:    '#eef2ff',
  ONSITE:       '#f0f9ff',
  OFFER:        '#f0fdf4',
  REJECTED:     '#fef2f2',
  WITHDRAWN:    '#f9fafb',
  GHOSTED:      '#fffbeb'
};

export const STATUS_ICONS: Record<JobApplicationStatus, string> = {
  APPLIED:      'bi-send',
  PHONE_SCREEN: 'bi-telephone',
  TECHNICAL:    'bi-code-slash',
  ONSITE:       'bi-building',
  OFFER:        'bi-trophy',
  REJECTED:     'bi-x-circle',
  WITHDRAWN:    'bi-arrow-left-circle',
  GHOSTED:      'bi-question-circle'
};

export const FORMAT_LABELS: Record<InterviewFormat, string> = {
  PHONE:     'Phone',
  VIDEO:     'Video',
  ONSITE:    'On-site',
  TAKE_HOME: 'Take-home'
};

export const FORMAT_ICONS: Record<InterviewFormat, string> = {
  PHONE:     'bi-telephone',
  VIDEO:     'bi-camera-video',
  ONSITE:    'bi-building',
  TAKE_HOME: 'bi-laptop'
};

export const OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  PENDING:   'Pending',
  PASSED:    'Passed',
  FAILED:    'Failed',
  CANCELLED: 'Cancelled'
};

export const OUTCOME_COLORS: Record<InterviewOutcome, string> = {
  PENDING:   '#f59e0b',
  PASSED:    '#22c55e',
  FAILED:    '#ef4444',
  CANCELLED: '#6b7280'
};
