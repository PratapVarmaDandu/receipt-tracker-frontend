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

/** Sellable product modules — mirrors the backend AppFeature enum */
export const APP_FEATURES: { key: string; label: string; icon: string }[] = [
  { key: 'EXPENSE_SHARING', label: 'Expense Sharing', icon: 'bi-people' },
  { key: 'DOCUMENT_VAULT',  label: 'Document Vault',  icon: 'bi-folder-symlink' },
  { key: 'GARAGE',          label: 'My Garage',       icon: 'bi-speedometer2' },
  { key: 'JOB_TRACKER',     label: 'Job Tracker',     icon: 'bi-briefcase' },
  { key: 'SHOP_POS',        label: 'Shop (POS)',      icon: 'bi-shop' }
];
