export interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  suspendedOrgs: number;
  freeOrgs: number;
  proOrgs: number;
  totalMembers: number;
  squareConfiguredOrgs: number;
  /** Orgs holding each feature grant, keyed by AppFeature name */
  featureAdoption: { [feature: string]: number };
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  joinedAt: string;
  platformAdmin: boolean;
  features: string[];
}

export interface PlatformSquareConfig {
  configured: boolean;
  applicationId?: string;
  locationId?: string;
  environment?: string;
  planIdGarage?: string;
  planIdVault?: string;
  planIdJobs?: string;
  planIdSuite?: string;
}

export interface PlatformSquareConfigRequest {
  accessToken?: string;
  applicationId?: string;
  locationId?: string;
  webhookSignatureKey?: string;
  environment?: string;
  planIdGarage?: string;
  planIdVault?: string;
  planIdJobs?: string;
  planIdSuite?: string;
}

/** Sellable product modules — mirrors the backend AppFeature enum */
export const APP_FEATURES: { key: string; label: string; icon: string }[] = [
  { key: 'EXPENSE_SHARING', label: 'Expense Sharing', icon: 'bi-people' },
  { key: 'DOCUMENT_VAULT',  label: 'Document Vault',  icon: 'bi-folder-symlink' },
  { key: 'GARAGE',          label: 'My Garage',       icon: 'bi-speedometer2' },
  { key: 'JOB_TRACKER',     label: 'Job Tracker',     icon: 'bi-briefcase' },
  { key: 'SHOP_POS',        label: 'Shop (POS)',      icon: 'bi-shop' }
];

export type SubmissionType = 'FEEDBACK' | 'BUG_REPORT' | 'IDEA';
export type SubmissionStatus = 'NEW' | 'REVIEWED' | 'RESOLVED';

export interface PlatformSubmission {
  id: number;
  type: SubmissionType;
  message: string;
  attachmentMimeType: string | null;
  status: SubmissionStatus;
  rewardGranted: boolean;
  createdAt: string;
  submitterName: string;
  submitterEmail: string;
}
