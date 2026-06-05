export type DocumentCategory = 'RESUME' | 'TAX' | 'INCOME' | 'IMMIGRATION' | 'OTHER';
export type DocumentStatus   = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
export type StepUrgency      = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'DONE';

// ── Subcategory definitions ───────────────────────────────────────────────

export interface SubcategoryOption {
  value: string;
  label: string;
  visaType?: string;  // for IMMIGRATION grouping
}

export const SUBCATEGORIES: Record<DocumentCategory, SubcategoryOption[]> = {
  RESUME: [
    { value: 'RESUME_GENERAL',   label: 'General Resume' },
    { value: 'RESUME_TECHNICAL', label: 'Technical Resume' },
    { value: 'CV',               label: 'Curriculum Vitae (CV)' },
    { value: 'COVER_LETTER',     label: 'Cover Letter' },
    { value: 'PORTFOLIO',        label: 'Portfolio' },
  ],
  TAX: [
    { value: 'W2',          label: 'W-2 (Wage Statement)' },
    { value: '1099_NEC',    label: '1099-NEC (Freelance)' },
    { value: '1099_INT',    label: '1099-INT (Interest)' },
    { value: '1099_DIV',    label: '1099-DIV (Dividends)' },
    { value: '1099_MISC',   label: '1099-MISC' },
    { value: '1099_B',      label: '1099-B (Broker Sales)' },
    { value: '1040',        label: 'Form 1040 (Federal Return)' },
    { value: 'SCHEDULE_C',  label: 'Schedule C (Self-Employment)' },
    { value: 'SCHEDULE_D',  label: 'Schedule D (Capital Gains)' },
    { value: 'STATE_RETURN', label: 'State Tax Return' },
    { value: 'TAX_EXTENSION', label: 'Extension (Form 4868)' },
    { value: 'OTHER_TAX',   label: 'Other Tax Document' },
  ],
  INCOME: [
    { value: 'PAY_STUB',       label: 'Pay Stub' },
    { value: 'OFFER_LETTER',   label: 'Offer Letter' },
    { value: 'BONUS_LETTER',   label: 'Bonus / Equity Letter' },
    { value: 'RSU_VESTING',    label: 'RSU Vesting Statement' },
    { value: 'BANK_STATEMENT', label: 'Bank Statement' },
    { value: 'INVESTMENT_STMT', label: 'Investment Statement' },
    { value: 'RENTAL_INCOME',  label: 'Rental Income Record' },
    { value: 'OTHER_INCOME',   label: 'Other Income Document' },
  ],
  IMMIGRATION: [
    // F1 Student
    { value: 'F1_I20',       label: 'I-20 (F1 Student)',        visaType: 'F1' },
    { value: 'F1_VISA',      label: 'F1 Visa Stamp',            visaType: 'F1' },
    { value: 'F1_EAD_OPT',  label: 'EAD — OPT',               visaType: 'F1' },
    { value: 'F1_EAD_STEM', label: 'EAD — STEM OPT',          visaType: 'F1' },
    { value: 'F1_CPT',      label: 'CPT Authorization',         visaType: 'F1' },
    { value: 'SEVIS',       label: 'SEVIS Receipt',             visaType: 'F1' },
    // H1B Work Visa
    { value: 'H1B_PETITION', label: 'H1B Petition (I-129)',    visaType: 'H1B' },
    { value: 'H1B_APPROVAL', label: 'H1B Approval Notice',     visaType: 'H1B' },
    { value: 'H1B_VISA',    label: 'H1B Visa Stamp',           visaType: 'H1B' },
    { value: 'H1B_I94',     label: 'I-94 Arrival Record',      visaType: 'H1B' },
    { value: 'H1B_LCA',     label: 'LCA (Labor Condition)',     visaType: 'H1B' },
    { value: 'H1B_AMENDMENT', label: 'H1B Amendment',          visaType: 'H1B' },
    { value: 'H1B_EXTENSION', label: 'H1B Extension',          visaType: 'H1B' },
    // Green Card
    { value: 'GC_I140',     label: 'I-140 Immigrant Petition', visaType: 'GC' },
    { value: 'GC_I485',     label: 'I-485 Adjustment of Status', visaType: 'GC' },
    { value: 'GC_EAD',      label: 'EAD / AP (Combo Card)',    visaType: 'GC' },
    { value: 'GC_CARD',     label: 'Green Card (I-551)',        visaType: 'GC' },
    { value: 'GC_I130',     label: 'I-130 Family Petition',    visaType: 'GC' },
    { value: 'GC_INTERVIEW', label: 'GC Interview Notice',     visaType: 'GC' },
    { value: 'GC_RFE',      label: 'RFE Response',             visaType: 'GC' },
    // OCA / Other Authorization
    { value: 'OCA_PERMIT',  label: 'OCA Work Permit',          visaType: 'OCA' },
    { value: 'OCA_LETTER',  label: 'OCA Authorization Letter', visaType: 'OCA' },
    // Universal
    { value: 'PASSPORT',    label: 'Passport',                 visaType: 'GENERAL' },
    { value: 'I94',         label: 'I-94 Travel Record',       visaType: 'GENERAL' },
    { value: 'BIRTH_CERT',  label: 'Birth Certificate',        visaType: 'GENERAL' },
    { value: 'MARRIAGE_CERT', label: 'Marriage Certificate',   visaType: 'GENERAL' },
    { value: 'OTHER_IMM',   label: 'Other Immigration Doc',    visaType: 'GENERAL' },
  ],
  OTHER: [
    { value: 'CONTRACT',    label: 'Contract / Agreement' },
    { value: 'INSURANCE',   label: 'Insurance Policy' },
    { value: 'MEDICAL',     label: 'Medical Record' },
    { value: 'PROPERTY',    label: 'Property Document' },
    { value: 'EDUCATION',   label: 'Education / Transcript' },
    { value: 'OTHER',       label: 'Other' },
  ],
};

// ── Display metadata ──────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  RESUME:      'Resume & Career',
  TAX:         'Tax Documents',
  INCOME:      'Income Records',
  IMMIGRATION: 'Immigration',
  OTHER:       'Other Documents',
};

export const CATEGORY_ICONS: Record<DocumentCategory, string> = {
  RESUME:      'bi-person-badge',
  TAX:         'bi-file-earmark-text',
  INCOME:      'bi-cash-coin',
  IMMIGRATION: 'bi-globe2',
  OTHER:       'bi-folder',
};

export const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  RESUME:      '#4f46e5',
  TAX:         '#0369a1',
  INCOME:      '#16a34a',
  IMMIGRATION: '#7c3aed',
  OTHER:       '#64748b',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  ACTIVE:        'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED:       'Expired',
};

// ── Interfaces ────────────────────────────────────────────────────────────

export interface DocumentNextStep {
  id: number;
  documentId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  urgency: StepUrgency;
}

export interface DocFile {
  id: number;
  title: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  category: DocumentCategory;
  subcategory: string | null;
  documentYear: number | null;
  expiryDate: string | null;
  notes: string | null;
  archived: boolean;
  status: DocumentStatus;
  daysUntilExpiry: number | null;
  nextSteps: DocumentNextStep[];
  uploadedAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  total: number;
  expiringSoon: number;
  expired: number;
  pendingNextSteps: number;
  byCategory: Record<DocumentCategory, number>;
}

export interface DocumentShare {
  id: number;
  recipientEmail: string;
  recipientName: string | null;
  purpose: string | null;
  message: string | null;
  shareToken: string;
  expiresAt: string;
  sharedAt: string;
  accessed: boolean;
  expired: boolean;
  documents: DocFile[];
}

export interface CreateDocumentShareRequest {
  documentIds: number[];
  recipientEmail: string;
  recipientName?: string;
  purpose?: string;
  message?: string;
  expiryDays?: number;
}

// ── Immigration visa type grouping ────────────────────────────────────────

export const VISA_TYPE_LABELS: Record<string, string> = {
  F1:      'F1 — Student Visa',
  H1B:     'H1B — Work Visa',
  GC:      'Green Card',
  OCA:     'OCA — Other Authorization',
  GENERAL: 'General Documents',
};
