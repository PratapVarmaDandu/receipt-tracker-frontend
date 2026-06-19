import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
