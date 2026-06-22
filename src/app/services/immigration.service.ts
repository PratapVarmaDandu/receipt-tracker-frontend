import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

export interface ImmigrationCase {
  id: number;
  caseNumber: string;
  beneficiaryId: number | null;
  beneficiaryName: string | null;
  beneficiaryEmail: string | null;
  employerImmOrgId: number | null;
  employerImmOrgName: string | null;
  lawFirmImmOrgId: number | null;
  lawFirmImmOrgName: string | null;
  caseType: string;
  status: string;
  priorityDate: string | null;
  receiptNumber: string | null;
  parentCaseId: number | null;
  i140Approved: boolean;
  i140ApprovedDate: string | null;
  assignedAttorneyMemberId: number | null;
  assignedAttorneyName: string | null;
  assignedAttorneyEmail: string | null;
  assignedParalegalMemberId: number | null;
  assignedParalegalName: string | null;
  assignedParalegalEmail: string | null;
  beneficiaryInvitePending: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  callerRelationship: string | null;   // BENEFICIARY / ATTORNEY / HR_ADMIN / VIEWER / null
}

export interface BeneficiaryStatus {
  isBeneficiary: boolean;
}

export interface CreateCaseRequest {
  caseType: string;
  beneficiaryEmail: string;
  employerImmOrgId?: number | null;
  lawFirmImmOrgId?: number | null;
  parentCaseId?: number | null;
  assignedAttorneyMemberId?: number | null;
}

export const CASE_TYPE_LABELS: Record<string, string> = {
  // H-1B family
  H1B_INITIAL:    'H-1B Initial',
  H1B_EXTENSION:  'H-1B Extension',
  H1B_TRANSFER:   'H-1B Transfer',
  H1B_AMENDMENT:  'H-1B Amendment',
  // H-4 dependents
  H4:             'H-4 Dependent',
  H4_EAD:         'H-4 EAD (Work Permit)',
  // Green card — employer-sponsored
  PERM:           'PERM Labor Certification',
  I140_EB2:       'I-140 EB-2 Petition',
  I140_EB3:       'I-140 EB-3 Petition',
  // Adjustment of status
  I485:           'I-485 Adjustment of Status',
  GC_EAD:         'GC EAD (Work Permit)',
  GC_RENEWAL:     'Green Card Renewal',
  // Citizenship
  NATURALIZATION: 'Naturalization (N-400)',
  // Other
  CONSULAR:       'Consular Processing',
};

// Groups for the case-form dropdown
export const CASE_TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'H-1B Specialty Occupation', types: ['H1B_INITIAL', 'H1B_EXTENSION', 'H1B_TRANSFER', 'H1B_AMENDMENT'] },
  { label: 'H-4 Dependents',            types: ['H4', 'H4_EAD'] },
  { label: 'Green Card Pathway',        types: ['PERM', 'I140_EB2', 'I140_EB3', 'I485', 'GC_EAD'] },
  { label: 'Green Card & Citizenship',  types: ['GC_RENEWAL', 'NATURALIZATION'] },
  { label: 'Other',                     types: ['CONSULAR'] },
];

export const STATUS_LABELS: Record<string, string> = {
  PROSPECTIVE:         'Prospective',
  DATA_COLLECTION:     'Data Collection',
  PETITION_FILED:      'Petition Filed',
  RFE_PENDING:         'RFE Pending',
  PETITION_APPROVED:   'Petition Approved',
  DS160_FILED:         'DS-160 Filed',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  VISA_ISSUED:         'Visa Issued',
  ADMITTED:            'Admitted',
  CLOSED:              'Closed',
  DENIED:              'Denied',
  WITHDRAWN:           'Withdrawn',
};

export interface Address {
  line1?: string; line2?: string; city?: string; state?: string; zip?: string; country?: string;
}

export interface PassportEntry {
  id?: string;
  number?: string;
  country?: string;
  issueDate?: string;
  expiryDate?: string;
  // Additional passport-page fields (captured from a passport scan)
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  placeOfBirth?: string;
  notes?: string;
  documentIds?: number[];
}

export interface TravelEntry {
  id?: string;
  portOfEntry?: string;
  i94Number?: string;
  entryDate?: string;
  admittedUntil?: string;
  visaClass?: string;
  notes?: string;
  documentIds?: number[];
}

export interface Education {
  institution?: string; degree?: string; field?: string; startYear?: number; endYear?: number;
  documentIds?: number[];
}
export interface Employment {
  employer?: string; title?: string; startDate?: string; endDate?: string; country?: string;
  documentIds?: number[];
}
export interface Dependent {
  name?: string; relationship?: string; dateOfBirth?: string; citizenshipCountry?: string;
  documentIds?: number[];
}
export interface PriorVisa {
  visaType?: string; country?: string; issueDate?: string; expiryDate?: string;
  documentIds?: number[];
}

export interface CanonicalProfile {
  id: number;
  beneficiaryId: number;
  legalFirstName?: string;
  legalLastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  citizenshipCountry?: string;
  gender?: string;
  passports?: PassportEntry[];
  travelEntries?: TravelEntry[];
  currentVisaType?: string;
  currentVisaExpiry?: string;
  phone?: string;
  currentAddress?: Address;
  education?: Education[];
  employment?: Employment[];
  dependents?: Dependent[];
  priorVisas?: PriorVisa[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KeyDate {
  id: number;
  caseId: number;
  dateType: string;
  label: string;
  date: string;
  daysUntil: number;
  urgency: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';
  autoComputed: boolean;
  notes?: string;
}

export interface TimelineItem {
  id: number;
  itemType: 'EVENT' | 'APPOINTMENT';
  eventType: string;
  typeLabel: string;
  title: string;
  description?: string;
  location?: string;
  status?: string;
  date: string;
  systemGenerated: boolean;
  performedByName?: string;
}

export const EVENT_TYPE_ICONS: Record<string, string> = {
  STATUS_CHANGED:       'bi-arrow-repeat',
  DOCUMENT_UPLOADED:    'bi-file-earmark-arrow-up',
  RFE_RECEIVED:         'bi-exclamation-triangle',
  PETITION_FILED:       'bi-send',
  BIOMETRICS_COMPLETED: 'bi-fingerprint',
  INTERVIEW_ATTENDED:   'bi-camera-video',
  VISA_ISSUED:          'bi-passport',
  NOTE:                 'bi-sticky',
  OTHER:                'bi-circle',
  USCIS_INTERVIEW:      'bi-building',
  BIOMETRICS:           'bi-fingerprint',
  CONSULATE_INTERVIEW:  'bi-flag',
  ATTORNEY_MEETING:     'bi-person-badge',
  APPOINTMENT:          'bi-calendar-event',
};

export interface FormInstance {
  id: number;
  caseId: number;
  formType: string;
  formTypeLabel: string;
  status: string;
  fieldData: Record<string, any> | null;
  completeness: number;
  submittedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const FORM_STATUS_LABELS: Record<string, string> = {
  DRAFT:         'Draft',
  READY_TO_FILE: 'Ready to Review',
  FILED:         'Filed',
  APPROVED:      'Approved',
  REJECTED:      'Rejected',
};

export const FORM_STATUS_CSS: Record<string, string> = {
  DRAFT:         'status-muted',
  READY_TO_FILE: 'status-pending',
  FILED:         'status-active',
  APPROVED:      'status-success',
  REJECTED:      'status-danger',
};

export interface ActivityFeedItem {
  id: number;
  action: string;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

export interface ConsentRecord {
  id: number;
  caseId: number;
  coversRelationship: string;
  granted: boolean;
  actionAt: string;
  notes: string | null;
}

export interface ImmMessage {
  id: number;
  threadId: number;
  channel: string;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export const CHANNEL_LABELS: Record<string, string> = {
  SHARED:                'Shared',
  ATTORNEY_BENEFICIARY:  'Attorney ↔ Beneficiary',
  ATTORNEY_EMPLOYER:     'Attorney ↔ Employer',
  ATTORNEY_INTERNAL:     'Internal Notes',
};

export interface H1bCapRegistration {
  id: number;
  caseId: number;
  caseNumber: string;
  registrationYear: number;
  registrationNumber: string | null;
  selectedInLottery: boolean | null;
  selectionDate: string | null;
  registrationDate: string;
  createdAt: string;
}

export interface CapSeasonSummary {
  registrationYear: number;
  total: number;
  selected: number;
  notSelected: number;
  pendingResult: number;
}

export interface CaseTask {
  id: number;
  caseId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedToMemberId: number | null;
  assignedToName: string | null;
  completedAt: string | null;
  completedByUserId: number | null;
  completedByName: string | null;
  isRequired: boolean;
  createdByUserId: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
  overdue: boolean;
}

export interface CreateCaseTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignedToMemberId?: number | null;
  isRequired?: boolean;
}

export interface ConflictCheckRequest {
  beneficiaryEmail: string;
  employerOrgId?: number | null;
}

export interface FamilyBundle {
  primaryCase: ImmigrationCase;
  dependentCases: ImmigrationCase[];
}

export interface StatusHistoryItem {
  id: number;
  caseId: number;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: number | null;
  changedByName: string | null;
  changedAt: string;
  note: string | null;
}

export interface BarNumber {
  state: string;
  barNumber: string;
  admittedDate?: string;
}

export interface CaseRfe {
  id: number;
  caseId: number;
  issuedDate: string;
  responseDeadline: string;
  uscisCategory: string | null;
  uscisNote: string | null;
  status: 'OPEN' | 'RESPONDED' | 'WITHDRAWN' | 'DISMISSED';
  respondedAt: string | null;
  createdByUserId: number | null;
  createdAt: string;
  daysUntilDeadline: number;
}

export interface CreateRfeRequest {
  issuedDate: string;
  responseDeadline?: string;
  uscisCategory?: string;
  uscisNote?: string;
}

export interface UscisStatusResult {
  id: number;
  caseId: number;
  polledAt: string;
  rawStatusText: string | null;
  detectedStatus: string | null;
  statusChanged: boolean;
}

export interface AttorneyProfile {
  id: number | null;
  immOrgMemberId: number;
  barNumbers: BarNumber[];
  bio: string | null;
  signatureImageKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ── FEAT-M4: I-9 Compliance ───────────────────────────────────────────────
export interface I9Record {
  id: number;
  employerImmOrgId: number;
  employeeEmail: string;
  employeeName: string;
  workAuthType: string | null;
  documentTitle: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  verifiedAt: string | null;
  reverificationDue: string | null;
  status: 'CURRENT' | 'EXPIRING_SOON' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateI9RecordRequest {
  employeeEmail: string;
  employeeName: string;
  workAuthType?: string;
  documentTitle?: string;
  documentNumber?: string;
  expiryDate?: string | null;
  verifiedAt?: string;
  reverificationDue?: string | null;
}

// ── FEAT-M5: Visa Bulletin ────────────────────────────────────────────────
export interface VisaBulletinEntry {
  id: number;
  bulletinYear: number;
  bulletinMonth: number;
  preferenceCategory: string;
  countryOfChargeability: string;
  finalActionDate: string | null;  // null = C (current)
  datesForFiling: string | null;
  scrapedAt: string;
}

export interface PriorityDateStatus {
  priorityDate: string;
  countryOfBirth: string | null;
  preferenceCategory: string;
  currentCutoff: string | null;   // null = C (current)
  isCurrent: boolean;
  monthsBehind: number | null;
}

// ── FEAT-M7: Intake questionnaire ────────────────────────────────────────────

export interface ProfileDataRequest {
  id: number;
  caseId: number;
  targetRelationship: string;
  token: string;
  sections: string[];
  status: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
  submittedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CreateDataRequestRequest {
  targetRelationship: string;
  sections: string[];
  expiryDays: number;
}

export interface DataRequestPublicInfo {
  id: number;
  caseNumber: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
  targetRelationship: string;
  sections: string[];
  status: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
  expiresAt: string;
  prefillData: CanonicalProfile | null;
}

// ── FEAT-M8: Evidence Checklist ──────────────────────────────────────────────

export interface ChecklistItem {
  id: number;
  caseId: number;
  templateId?: number;
  itemKey: string;
  label: string;
  category: string;
  required: boolean;
  status: 'PENDING' | 'UPLOADED' | 'WAIVED' | 'VERIFIED';
  documentId?: number;
  waiverReason?: string;
  verifiedByUserId?: number;
  verifiedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateChecklistRequest {
  formTypes: string[];
}

export interface UpdateChecklistItemRequest {
  status?: string;
  documentId?: number | null;
  waiverReason?: string | null;
}

// ── Filing Package System ────────────────────────────────────────────────────

export interface FilingPackageQuestionnaire {
  id: number;
  packageId: number;
  targetRelationship: string;  // BENEFICIARY | EMPLOYER | ATTORNEY
  token: string;
  status: string;              // PENDING | SUBMITTED | EXPIRED
  submittedAt?: string;
  expiresAt: string;
  createdAt: string;
  questionCount: number;
  answeredCount: number;
}

export interface FilingPackage {
  id: number;
  caseId: number;
  name: string;
  selectedFormTypes: string[];
  status: string;              // DRAFT | QUESTIONNAIRES_SENT | ANSWERS_COLLECTED | ATTORNEY_REVIEW | APPROVED | GENERATED | FILED
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  questionnaires: FilingPackageQuestionnaire[];
  completenessPercent: Record<string, number>;
}

export interface CreatePackageRequest {
  name: string;
  selectedFormTypes: string[];
}

export interface FormVersionUsed {
  formType: string;
  versionId: number;
  editionDate: string;
}

export interface GenerationAuditEntry {
  questionKey: string;
  pdfField: string;
  source: string;
  versionId: number;
  filled: boolean;
  formType: string;
}

export interface GeneratedPdfPacket {
  id: number;
  packageId: number;
  caseId: number;
  formVersionsUsed: FormVersionUsed[];
  generatedAt: string;
  generatedByUserId: number;
  status: string;               // DRAFT | ATTORNEY_APPROVED | FILED
  attorneyApprovedAt?: string;
  attorneyApprovedBy?: number;
  pdfStorageKey?: string;
  generationAudit: GenerationAuditEntry[];
  createdAt: string;
}

export interface FieldExtraction {
  value: string;
  confidence: number;
  needsReview: boolean;
}

export interface ScanResult {
  docTypeDetected: string;
  extractedFields: Record<string, FieldExtraction>;
  lowConfidenceFields: string[];
  caseReceiptNumberSuggestion?: string;
}

export interface QuestionnaireQuestion {
  key: string;
  label: string;
  sublabel?: string;
  type: string;                // TEXT | TEXT_SENSITIVE | DATE | NUMBER | BOOLEAN | SELECT | TEXTAREA
  required: boolean;
  validation?: Record<string, unknown>;
  options?: string[];
  prefillValue?: string;
  prefillSource?: string;      // profile | org | questionnaire | none
}

export interface QuestionnaireSection {
  sectionId: string;
  sectionLabel: string;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnairePublicSpec {
  id: number;
  packageId: number;
  packageName: string;
  targetRelationship: string;
  status: string;
  expiresAt: string;
  submittedAt?: string;
  formTypes: string[];
  sections: QuestionnaireSection[];
}

export interface ReviewAnswerSummary {
  questionKey: string;
  label: string;
  type: string;
  required: boolean;
  hasValue: boolean;
  source: string;
  sensitive: boolean;
  stale: boolean;
}

export interface ReviewOwnerGroup {
  owner: string;
  completenessPercent: number;
  answers: ReviewAnswerSummary[];
}

export interface ReviewSummary {
  packageId: number;
  packageName: string;
  status: string;
  totalRequired: number;
  totalAnswered: number;
  completenessPercent: number;
  missingRequired: string[];
  byOwner: ReviewOwnerGroup[];
}

// ── Phase 5: Form Version Tracking ──────────────────────────────────────────

export interface FormVersionAuditEvent {
  id: number;
  formType: string;
  editionDate: string | null;
  action: string;
  performedByUserId: number | null;
  detail: string | null;
  createdAt: string;
}

export interface FormVersion {
  id: number;
  formType: string;
  formTypeDisplayName: string;
  editionDate: string;
  downloadedAt: string | null;
  pdfStorageKey: string | null;
  status: string;           // PENDING_REVIEW | APPROVED | DEPRECATED
  approvedByUserId: number | null;
  approvedAt: string | null;
  fieldMappingVerified: boolean;
  pdfFieldNames: string[];
  releaseNotes: string | null;
  hasProposedMapping: boolean;
  createdAt: string;
  recentAudit: FormVersionAuditEvent[] | null;
}

export const FORM_VERSION_STATUS_CSS: Record<string, string> = {
  PENDING_REVIEW: 'status-warning',
  APPROVED:       'status-success',
  DEPRECATED:     'status-muted',
};

export const STATUS_CSS: Record<string, string> = {
  PROSPECTIVE:         'status-draft',
  DATA_COLLECTION:     'status-active',
  PETITION_FILED:      'status-pending',
  RFE_PENDING:         'status-warning',
  PETITION_APPROVED:   'status-success',
  DS160_FILED:         'status-pending',
  INTERVIEW_SCHEDULED: 'status-pending',
  VISA_ISSUED:         'status-success',
  ADMITTED:            'status-success',
  CLOSED:              'status-muted',
  DENIED:              'status-danger',
  WITHDRAWN:           'status-muted',
};

@Injectable({ providedIn: 'root' })
export class ImmigrationService {
  private readonly source = 'ImmigrationService';
  private readonly base = `${environment.apiUrl}/immigration`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getBeneficiaryStatus(): Observable<BeneficiaryStatus> {
    const t = Date.now();
    return this.http.get<BeneficiaryStatus>(`${this.base}/beneficiary/status`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/immigration/beneficiary/status', t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/immigration/beneficiary/status', err, t); throw err; })
    );
  }

  initBeneficiary(): Observable<any> {
    const t = Date.now();
    return this.http.post<any>(`${this.base}/beneficiary/init`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', '/immigration/beneficiary/init', t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/immigration/beneficiary/init', err, t); throw err; })
    );
  }

  listCases(): Observable<ImmigrationCase[]> {
    const t = Date.now();
    return this.http.get<ImmigrationCase[]>(`${this.base}/cases`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/immigration/cases', t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/immigration/cases', err, t); throw err; })
    );
  }

  getCase(id: number): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.get<ImmigrationCase>(`${this.base}/cases/${id}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${id}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${id}`, err, t); throw err; })
    );
  }

  createCase(req: CreateCaseRequest): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.post<ImmigrationCase>(`${this.base}/cases`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', '/immigration/cases', t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/immigration/cases', err, t); throw err; })
    );
  }

  // Public — no auth needed; shows case info before beneficiary logs in
  getCaseByInviteToken(token: string): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.get<ImmigrationCase>(`${this.base}/cases/join/${token}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/join/${token}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/join/${token}`, err, t); throw err; })
    );
  }

  // Auth required — beneficiary accepts their invite
  acceptCaseInvite(token: string): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.post<ImmigrationCase>(`${this.base}/cases/join/${token}`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/join/${token}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/join/${token}`, err, t); throw err; })
    );
  }

  // Auth required — accept an invite from the in-app banner (by case id, no token)
  acceptCaseInviteById(caseId: number): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.post<ImmigrationCase>(`${this.base}/cases/${caseId}/accept-invite`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/accept-invite`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/accept-invite`, err, t); throw err; })
    );
  }

  getCaseBeneficiaryProfile(caseId: number): Observable<CanonicalProfile> {
    const t = Date.now();
    return this.http.get<CanonicalProfile>(`${this.base}/cases/${caseId}/beneficiary/profile`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/beneficiary/profile`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/beneficiary/profile`, err, t); throw err; })
    );
  }

  getMyProfile(): Observable<CanonicalProfile> {
    const t = Date.now();
    return this.http.get<CanonicalProfile>(`${this.base}/profile/me`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/immigration/profile/me', t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/immigration/profile/me', err, t); throw err; })
    );
  }

  updateMyProfile(req: Partial<CanonicalProfile>): Observable<CanonicalProfile> {
    const t = Date.now();
    return this.http.put<CanonicalProfile>(`${this.base}/profile/me`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', '/immigration/profile/me', t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', '/immigration/profile/me', err, t); throw err; })
    );
  }

  downloadCaseProfileDoc(caseId: number, docId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/cases/${caseId}/profile/documents/${docId}/download`,
      { responseType: 'blob' }
    );
  }

  updateStatus(id: number, status: string): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.put<ImmigrationCase>(`${this.base}/cases/${id}/status`, { status }).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${id}/status`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${id}/status`, err, t); throw err; })
    );
  }

  // ── Key dates ────────────────────────────────────────────────────────────

  getKeyDates(caseId: number): Observable<KeyDate[]> {
    const t = Date.now();
    return this.http.get<KeyDate[]>(`${this.base}/cases/${caseId}/key-dates`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/key-dates`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/key-dates`, err, t); throw err; })
    );
  }

  syncKeyDates(caseId: number): Observable<KeyDate[]> {
    const t = Date.now();
    return this.http.post<KeyDate[]>(`${this.base}/cases/${caseId}/key-dates/sync`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/key-dates/sync`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/key-dates/sync`, err, t); throw err; })
    );
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  getTimeline(caseId: number): Observable<TimelineItem[]> {
    const t = Date.now();
    return this.http.get<TimelineItem[]>(`${this.base}/cases/${caseId}/timeline`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/timeline`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/timeline`, err, t); throw err; })
    );
  }

  createEvent(caseId: number, req: { eventType: string; eventDate: string; title: string; description?: string }): Observable<TimelineItem> {
    const t = Date.now();
    return this.http.post<TimelineItem>(`${this.base}/cases/${caseId}/timeline/events`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/timeline/events`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/timeline/events`, err, t); throw err; })
    );
  }

  deleteEvent(caseId: number, eventId: number): Observable<void> {
    const t = Date.now();
    return this.http.delete<void>(`${this.base}/cases/${caseId}/timeline/events/${eventId}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'DELETE', `/immigration/cases/${caseId}/timeline/events/${eventId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'DELETE', `/immigration/cases/${caseId}/timeline/events/${eventId}`, err, t); throw err; })
    );
  }

  createAppointment(caseId: number, req: { appointmentType: string; scheduledAt: string; location?: string; notes?: string }): Observable<TimelineItem> {
    const t = Date.now();
    return this.http.post<TimelineItem>(`${this.base}/cases/${caseId}/timeline/appointments`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/timeline/appointments`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/timeline/appointments`, err, t); throw err; })
    );
  }

  deleteAppointment(caseId: number, apptId: number): Observable<void> {
    const t = Date.now();
    return this.http.delete<void>(`${this.base}/cases/${caseId}/timeline/appointments/${apptId}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'DELETE', `/immigration/cases/${caseId}/timeline/appointments/${apptId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'DELETE', `/immigration/cases/${caseId}/timeline/appointments/${apptId}`, err, t); throw err; })
    );
  }

  // ── Forms ────────────────────────────────────────────────────────────────

  getForms(caseId: number): Observable<FormInstance[]> {
    const t = Date.now();
    return this.http.get<FormInstance[]>(`${this.base}/cases/${caseId}/forms`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/forms`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/forms`, err, t); throw err; })
    );
  }

  generateForms(caseId: number): Observable<FormInstance[]> {
    const t = Date.now();
    return this.http.post<FormInstance[]>(`${this.base}/cases/${caseId}/forms/generate`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/forms/generate`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/forms/generate`, err, t); throw err; })
    );
  }

  shareForm(caseId: number, formId: number, req: { recipientEmail: string; recipientType: string; expiryDays: number }): Observable<{ id: number; token: string; recipientEmail: string; recipientType: string; expiresAt: string }> {
    const t = Date.now();
    return this.http.post<any>(`${this.base}/cases/${caseId}/forms/${formId}/share`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/forms/${formId}/share`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/forms/${formId}/share`, err, t); throw err; })
    );
  }

  updateFormStatus(caseId: number, formId: number, status: string): Observable<FormInstance> {
    const t = Date.now();
    return this.http.put<FormInstance>(`${this.base}/cases/${caseId}/forms/${formId}/status`, { status }).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/forms/${formId}/status`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/forms/${formId}/status`, err, t); throw err; })
    );
  }

  // ── Activity feed ─────────────────────────────────────────────────────────

  getActivityFeed(caseId: number): Observable<ActivityFeedItem[]> {
    const t = Date.now();
    return this.http.get<ActivityFeedItem[]>(`${this.base}/cases/${caseId}/feed`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/feed`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/feed`, err, t); throw err; })
    );
  }

  // ── Consent ───────────────────────────────────────────────────────────────

  getConsent(caseId: number): Observable<ConsentRecord[]> {
    const t = Date.now();
    return this.http.get<ConsentRecord[]>(`${this.base}/cases/${caseId}/consent`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/consent`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/consent`, err, t); throw err; })
    );
  }

  grantConsent(caseId: number, relationship: string, notes?: string): Observable<ConsentRecord> {
    const t = Date.now();
    return this.http.post<ConsentRecord>(`${this.base}/cases/${caseId}/consent/grant`, { relationship, notes }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/consent/grant`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/consent/grant`, err, t); throw err; })
    );
  }

  revokeConsent(caseId: number, relationship: string, notes?: string): Observable<ConsentRecord> {
    const t = Date.now();
    return this.http.post<ConsentRecord>(`${this.base}/cases/${caseId}/consent/revoke`, { relationship, notes }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/consent/revoke`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/consent/revoke`, err, t); throw err; })
    );
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  getMessages(caseId: number, channel: string): Observable<ImmMessage[]> {
    const t = Date.now();
    return this.http.get<ImmMessage[]>(`${this.base}/cases/${caseId}/messages/${channel}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/messages/${channel}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/messages/${channel}`, err, t); throw err; })
    );
  }

  sendMessage(caseId: number, channel: string, content: string): Observable<ImmMessage> {
    const t = Date.now();
    return this.http.post<ImmMessage>(`${this.base}/cases/${caseId}/messages/${channel}`, { content }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/messages/${channel}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/messages/${channel}`, err, t); throw err; })
    );
  }

  assignParalegal(caseId: number, memberId: number | null): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.post<ImmigrationCase>(`${this.base}/cases/${caseId}/assign-paralegal`, { memberId }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/assign-paralegal`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/assign-paralegal`, err, t); throw err; })
    );
  }

  markMessagesRead(caseId: number, channel: string): Observable<void> {
    const t = Date.now();
    return this.http.post<void>(`${this.base}/cases/${caseId}/messages/${channel}/mark-read`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/messages/${channel}/mark-read`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/messages/${channel}/mark-read`, err, t); throw err; })
    );
  }

  getUnreadCounts(caseId: number): Observable<Record<string, number>> {
    const t = Date.now();
    return this.http.get<Record<string, number>>(`${this.base}/cases/${caseId}/messages/unread-counts`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/messages/unread-counts`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/messages/unread-counts`, err, t); throw err; })
    );
  }

  // ── Conflict check (FEAT-QW5) ────────────────────────────────────────────

  checkConflict(req: ConflictCheckRequest): Observable<ImmigrationCase[]> {
    const t = Date.now();
    return this.http.post<ImmigrationCase[]>(`${this.base}/cases/conflict-check`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', '/immigration/cases/conflict-check', t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/immigration/cases/conflict-check', err, t); throw err; })
    );
  }

  // ── Family bundle (FEAT-QW6) ─────────────────────────────────────────────

  getCaseFamily(caseId: number): Observable<FamilyBundle> {
    const t = Date.now();
    return this.http.get<FamilyBundle>(`${this.base}/cases/${caseId}/family`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/family`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/family`, err, t); throw err; })
    );
  }

  // ── Status history (FEAT-QW4) ─────────────────────────────────────────────

  getStatusHistory(caseId: number): Observable<StatusHistoryItem[]> {
    const t = Date.now();
    return this.http.get<StatusHistoryItem[]>(`${this.base}/cases/${caseId}/status-history`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/status-history`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/status-history`, err, t); throw err; })
    );
  }

  // ── Case clone (FEAT-QW3) ─────────────────────────────────────────────────

  cloneCase(caseId: number, newCaseType: string): Observable<ImmigrationCase> {
    const t = Date.now();
    return this.http.post<ImmigrationCase>(`${this.base}/cases/${caseId}/clone`, { newCaseType }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/clone`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/clone`, err, t); throw err; })
    );
  }

  // ── Attorney profile (FEAT-QW1) ───────────────────────────────────────────

  getAttorneyProfile(orgId: number): Observable<AttorneyProfile> {
    const t = Date.now();
    return this.http.get<AttorneyProfile>(`${this.base}/orgs/${orgId}/attorney-profile`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/orgs/${orgId}/attorney-profile`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/orgs/${orgId}/attorney-profile`, err, t); throw err; })
    );
  }

  updateAttorneyProfile(orgId: number, req: { barNumbers: BarNumber[]; bio?: string }): Observable<AttorneyProfile> {
    const t = Date.now();
    return this.http.put<AttorneyProfile>(`${this.base}/orgs/${orgId}/attorney-profile`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/orgs/${orgId}/attorney-profile`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/orgs/${orgId}/attorney-profile`, err, t); throw err; })
    );
  }

  // ── H-1B cap / lottery (FEAT-QW7) ────────────────────────────────────────

  getH1bCap(caseId: number): Observable<H1bCapRegistration | null> {
    const t = Date.now();
    return this.http.get<H1bCapRegistration>(`${this.base}/cases/${caseId}/h1b-cap`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/h1b-cap`, t)),
      catchError(err => {
        if (err.status === 204) return of(null);
        this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/h1b-cap`, err, t);
        throw err;
      })
    );
  }

  createH1bCap(caseId: number, req: { registrationYear: number; registrationNumber?: string; registrationDate: string }): Observable<H1bCapRegistration> {
    const t = Date.now();
    return this.http.post<H1bCapRegistration>(`${this.base}/cases/${caseId}/h1b-cap`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/h1b-cap`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/h1b-cap`, err, t); throw err; })
    );
  }

  updateLotteryResult(caseId: number, req: { selectedInLottery: boolean; selectionDate?: string | null }): Observable<H1bCapRegistration> {
    const t = Date.now();
    return this.http.put<H1bCapRegistration>(`${this.base}/cases/${caseId}/h1b-cap/lottery-result`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/h1b-cap/lottery-result`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/h1b-cap/lottery-result`, err, t); throw err; })
    );
  }

  getCapSeasonSummary(orgId: number, year?: number): Observable<CapSeasonSummary> {
    const t = Date.now();
    const params = year ? `?year=${year}` : '';
    return this.http.get<CapSeasonSummary>(`${this.base}/orgs/${orgId}/cap-season${params}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/orgs/${orgId}/cap-season`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/orgs/${orgId}/cap-season`, err, t); throw err; })
    );
  }

  // ── Case tasks (FEAT-QW8) ─────────────────────────────────────────────────

  listTasks(caseId: number): Observable<CaseTask[]> {
    const t = Date.now();
    return this.http.get<CaseTask[]>(`${this.base}/cases/${caseId}/tasks`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/tasks`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/tasks`, err, t); throw err; })
    );
  }

  createTask(caseId: number, req: CreateCaseTaskRequest): Observable<CaseTask> {
    const t = Date.now();
    return this.http.post<CaseTask>(`${this.base}/cases/${caseId}/tasks`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/tasks`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/tasks`, err, t); throw err; })
    );
  }

  updateTask(caseId: number, taskId: number, req: Partial<CreateCaseTaskRequest>): Observable<CaseTask> {
    const t = Date.now();
    return this.http.put<CaseTask>(`${this.base}/cases/${caseId}/tasks/${taskId}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/tasks/${taskId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/tasks/${taskId}`, err, t); throw err; })
    );
  }

  completeTask(caseId: number, taskId: number): Observable<CaseTask> {
    const t = Date.now();
    return this.http.put<CaseTask>(`${this.base}/cases/${caseId}/tasks/${taskId}/complete`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/tasks/${taskId}/complete`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/tasks/${taskId}/complete`, err, t); throw err; })
    );
  }

  deleteTask(caseId: number, taskId: number): Observable<void> {
    const t = Date.now();
    return this.http.delete<void>(`${this.base}/cases/${caseId}/tasks/${taskId}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'DELETE', `/immigration/cases/${caseId}/tasks/${taskId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'DELETE', `/immigration/cases/${caseId}/tasks/${taskId}`, err, t); throw err; })
    );
  }

  // ── RFE (FEAT-M2) ────────────────────────────────────────────────────────

  listRfes(caseId: number): Observable<CaseRfe[]> {
    const t = Date.now();
    return this.http.get<CaseRfe[]>(`${this.base}/cases/${caseId}/rfe`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/rfe`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/rfe`, err, t); throw err; })
    );
  }

  createRfe(caseId: number, req: CreateRfeRequest): Observable<CaseRfe> {
    const t = Date.now();
    return this.http.post<CaseRfe>(`${this.base}/cases/${caseId}/rfe`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/rfe`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/rfe`, err, t); throw err; })
    );
  }

  updateRfe(caseId: number, rfeId: number, req: Partial<CreateRfeRequest> & { status?: string }): Observable<CaseRfe> {
    const t = Date.now();
    return this.http.put<CaseRfe>(`${this.base}/cases/${caseId}/rfe/${rfeId}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/rfe/${rfeId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/rfe/${rfeId}`, err, t); throw err; })
    );
  }

  respondRfe(caseId: number, rfeId: number): Observable<CaseRfe> {
    const t = Date.now();
    return this.http.put<CaseRfe>(`${this.base}/cases/${caseId}/rfe/${rfeId}/respond`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/rfe/${rfeId}/respond`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/rfe/${rfeId}/respond`, err, t); throw err; })
    );
  }

  // ── USCIS polling (FEAT-M3) ──────────────────────────────────────────────

  getUscisHistory(caseId: number): Observable<UscisStatusResult[]> {
    const t = Date.now();
    return this.http.get<UscisStatusResult[]>(`${this.base}/cases/${caseId}/uscis-status-history`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/uscis-status-history`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/uscis-status-history`, err, t); throw err; })
    );
  }

  checkUscisNow(caseId: number): Observable<UscisStatusResult> {
    const t = Date.now();
    return this.http.post<UscisStatusResult>(`${this.base}/cases/${caseId}/uscis-check-now`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/uscis-check-now`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/uscis-check-now`, err, t); throw err; })
    );
  }

  // ── FEAT-M5: Visa Bulletin ────────────────────────────────────────────────

  getVisaBulletinLatest(): Observable<VisaBulletinEntry[]> {
    const t = Date.now();
    return this.http.get<VisaBulletinEntry[]>(`${this.base}/visa-bulletin/latest`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/immigration/visa-bulletin/latest', t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/immigration/visa-bulletin/latest', err, t); throw err; })
    );
  }

  getPriorityDateStatus(caseId: number): Observable<PriorityDateStatus> {
    const t = Date.now();
    return this.http.get<PriorityDateStatus>(`${this.base}/cases/${caseId}/priority-date-status`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/priority-date-status`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/priority-date-status`, err, t); throw err; })
    );
  }

  // ── FEAT-M6: Reports & Exports ────────────────────────────────────────────

  downloadCaseReport(caseId: number): Observable<Blob> {
    return this.http.get(`${this.base}/cases/${caseId}/report`, { responseType: 'blob' });
  }

  downloadTimelineExport(caseId: number): Observable<Blob> {
    return this.http.get(`${this.base}/cases/${caseId}/timeline/export`, { responseType: 'blob' });
  }

  // ── FEAT-M7: Intake questionnaire ─────────────────────────────────────────

  createDataRequest(caseId: number, req: CreateDataRequestRequest): Observable<ProfileDataRequest> {
    return this.http.post<ProfileDataRequest>(`${this.base}/cases/${caseId}/data-requests`, req);
  }

  listDataRequests(caseId: number): Observable<ProfileDataRequest[]> {
    return this.http.get<ProfileDataRequest[]>(`${this.base}/cases/${caseId}/data-requests`);
  }

  getDataRequestByToken(token: string): Observable<DataRequestPublicInfo> {
    return this.http.get<DataRequestPublicInfo>(`${this.base}/data-requests/${token}`);
  }

  submitDataRequest(token: string, sections: Record<string, unknown>): Observable<ProfileDataRequest> {
    return this.http.post<ProfileDataRequest>(`${this.base}/data-requests/${token}/submit`, { sections });
  }

  // ── FEAT-M8: Evidence Checklist ─────────────────────────────────────────

  generateChecklist(caseId: number, req: GenerateChecklistRequest): Observable<ChecklistItem[]> {
    const t = Date.now();
    return this.http.post<ChecklistItem[]>(`${this.base}/cases/${caseId}/checklist/generate`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/checklist/generate`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/checklist/generate`, err, t); throw err; })
    );
  }

  getChecklist(caseId: number): Observable<ChecklistItem[]> {
    const t = Date.now();
    return this.http.get<ChecklistItem[]>(`${this.base}/cases/${caseId}/checklist`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/checklist`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/checklist`, err, t); throw err; })
    );
  }

  updateChecklistItem(caseId: number, itemId: number, req: UpdateChecklistItemRequest): Observable<ChecklistItem> {
    const t = Date.now();
    return this.http.put<ChecklistItem>(`${this.base}/cases/${caseId}/checklist/${itemId}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/checklist/${itemId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/checklist/${itemId}`, err, t); throw err; })
    );
  }

  // ── Filing Package System ───────────────────────────────────────────────

  createPackage(caseId: number, req: CreatePackageRequest): Observable<FilingPackage> {
    const t = Date.now();
    return this.http.post<FilingPackage>(`${this.base}/cases/${caseId}/packages`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/packages`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/packages`, err, t); throw err; })
    );
  }

  listPackages(caseId: number): Observable<FilingPackage[]> {
    const t = Date.now();
    return this.http.get<FilingPackage[]>(`${this.base}/cases/${caseId}/packages`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/packages`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/packages`, err, t); throw err; })
    );
  }

  getPackage(caseId: number, packageId: number): Observable<FilingPackage> {
    const t = Date.now();
    return this.http.get<FilingPackage>(`${this.base}/cases/${caseId}/packages/${packageId}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}`, err, t); throw err; })
    );
  }

  sendQuestionnaires(caseId: number, packageId: number): Observable<FilingPackage> {
    const t = Date.now();
    return this.http.post<FilingPackage>(`${this.base}/cases/${caseId}/packages/${packageId}/send-questionnaires`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/send-questionnaires`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/send-questionnaires`, err, t); throw err; })
    );
  }

  getReviewSummary(caseId: number, packageId: number): Observable<ReviewSummary> {
    const t = Date.now();
    return this.http.get<ReviewSummary>(`${this.base}/cases/${caseId}/packages/${packageId}/review-summary`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}/review-summary`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}/review-summary`, err, t); throw err; })
    );
  }

  approvePackageAnswers(caseId: number, packageId: number): Observable<FilingPackage> {
    const t = Date.now();
    return this.http.post<FilingPackage>(`${this.base}/cases/${caseId}/packages/${packageId}/approve-answers`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/approve-answers`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/approve-answers`, err, t); throw err; })
    );
  }

  overridePackageAnswer(caseId: number, packageId: number, answerKey: string, req: { value: string; overrideReason: string }): Observable<unknown> {
    const t = Date.now();
    return this.http.put(`${this.base}/cases/${caseId}/packages/${packageId}/answers/${encodeURIComponent(answerKey)}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/immigration/cases/${caseId}/packages/${packageId}/answers/${answerKey}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/immigration/cases/${caseId}/packages/${packageId}/answers/${answerKey}`, err, t); throw err; })
    );
  }

  generatePdfPacket(caseId: number, packageId: number, overridePendingReview = false): Observable<GeneratedPdfPacket> {
    const t = Date.now();
    return this.http.post<GeneratedPdfPacket>(
      `${this.base}/cases/${caseId}/packages/${packageId}/generate-pdf`,
      { overridePendingReview }
    ).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/generate-pdf`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/generate-pdf`, err, t); throw err; })
    );
  }

  listPdfPackets(caseId: number, packageId: number): Observable<GeneratedPdfPacket[]> {
    const t = Date.now();
    return this.http.get<GeneratedPdfPacket[]>(`${this.base}/cases/${caseId}/packages/${packageId}/packets`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}/packets`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/cases/${caseId}/packages/${packageId}/packets`, err, t); throw err; })
    );
  }

  downloadPdfPacket(caseId: number, packageId: number, packetId: number): void {
    window.open(`/api/immigration/cases/${caseId}/packages/${packageId}/packets/${packetId}/download`, '_blank');
  }

  approvePdfPacket(caseId: number, packageId: number, packetId: number): Observable<GeneratedPdfPacket> {
    const t = Date.now();
    return this.http.post<GeneratedPdfPacket>(
      `${this.base}/cases/${caseId}/packages/${packageId}/packets/${packetId}/approve`, {}
    ).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/packets/${packetId}/approve`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/packages/${packageId}/packets/${packetId}/approve`, err, t); throw err; })
    );
  }

  scanProfileDocument(file: File): Observable<ScanResult> {
    const t = Date.now();
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ScanResult>(`${this.base}/profile/scan`, fd).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', '/immigration/profile/scan', t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/immigration/profile/scan', err, t); throw err; })
    );
  }

  scanCaseDocument(caseId: number, file: File): Observable<ScanResult> {
    const t = Date.now();
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ScanResult>(`${this.base}/cases/${caseId}/scan-document`, fd).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/cases/${caseId}/scan-document`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/cases/${caseId}/scan-document`, err, t); throw err; })
    );
  }

  getPublicQuestionnaire(token: string): Observable<QuestionnairePublicSpec> {
    const t = Date.now();
    return this.http.get<QuestionnairePublicSpec>(`${this.base}/packages/questionnaires/${token}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/packages/questionnaires/${token}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/packages/questionnaires/${token}`, err, t); throw err; })
    );
  }

  submitPublicQuestionnaire(token: string, answers: Record<string, string>): Observable<void> {
    const t = Date.now();
    return this.http.post<void>(`${this.base}/packages/questionnaires/${token}/submit`, { answers }).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/packages/questionnaires/${token}/submit`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/packages/questionnaires/${token}/submit`, err, t); throw err; })
    );
  }

  // ── Phase 5: Form Version Tracking ─────────────────────────────────────────

  getFormVersions(): Observable<Record<string, FormVersion[]>> {
    const t = Date.now();
    return this.http.get<Record<string, FormVersion[]>>(`${this.base}/form-versions`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/immigration/form-versions', t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/immigration/form-versions', err, t); throw err; })
    );
  }

  getFormVersion(id: number): Observable<FormVersion> {
    const t = Date.now();
    return this.http.get<FormVersion>(`${this.base}/form-versions/${id}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/immigration/form-versions/${id}`, t)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/immigration/form-versions/${id}`, err, t); throw err; })
    );
  }

  approveFormVersion(id: number): Observable<FormVersion> {
    const t = Date.now();
    return this.http.post<FormVersion>(`${this.base}/form-versions/${id}/approve`, {}).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/form-versions/${id}/approve`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/form-versions/${id}/approve`, err, t); throw err; })
    );
  }

  uploadFormVersionMapping(id: number, file: File): Observable<FormVersion> {
    const t = Date.now();
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<FormVersion>(`${this.base}/form-versions/${id}/upload-mapping`, fd).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/immigration/form-versions/${id}/upload-mapping`, t)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/immigration/form-versions/${id}/upload-mapping`, err, t); throw err; })
    );
  }
}
