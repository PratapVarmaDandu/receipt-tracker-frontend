import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import {
  ImmigrationService, ImmigrationCase, FormInstance, TimelineItem, KeyDate,
  ActivityFeedItem, ConsentRecord, ImmMessage, CanonicalProfile,
  CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS,
  FORM_STATUS_LABELS, FORM_STATUS_CSS, EVENT_TYPE_ICONS, CHANNEL_LABELS,
  StatusHistoryItem, AttorneyProfile, CASE_TYPE_GROUPS, FamilyBundle,
  H1bCapRegistration, CaseTask, CreateCaseTaskRequest,
  CaseRfe, CreateRfeRequest, UscisStatusResult, PriorityDateStatus,
  ProfileDataRequest, CreateDataRequestRequest,
  ChecklistItem, GenerateChecklistRequest, UpdateChecklistItemRequest,
  FilingPackage, GeneratedPdfPacket
} from '../../../services/immigration.service';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrgMember } from '../../../models/imm-org.model';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-case-detail',
  templateUrl: './case-detail.component.html',
  styleUrls: ['./case-detail.component.scss']
})
export class CaseDetailComponent implements OnInit {
  private readonly source = 'CaseDetailComponent';

  caseId = 0;
  case: ImmigrationCase | null = null;
  caseLoading = true;
  caseError: string | null = null;

  activeTab = 'overview';

  // Forms tab state
  forms: FormInstance[] = [];
  formsLoading = false;
  formsError: string | null = null;
  formsLoaded = false;
  generatingForms = false;
  expandedFormId: number | null = null;
  private _fieldCache = new Map<number, { key: string; value: string }[]>();

  readonly caseTypeLabels = CASE_TYPE_LABELS;
  readonly statusLabels   = STATUS_LABELS;
  readonly statusCss      = STATUS_CSS;
  readonly formStatusLabels = FORM_STATUS_LABELS;
  readonly formStatusCss    = FORM_STATUS_CSS;
  readonly eventTypeIcons   = EVENT_TYPE_ICONS;
  readonly channelLabels    = CHANNEL_LABELS;
  readonly caseTypeGroups   = CASE_TYPE_GROUPS;
  readonly channels = ['SHARED', 'ATTORNEY_BENEFICIARY', 'ATTORNEY_EMPLOYER', 'ATTORNEY_INTERNAL'];

  // Status history state (FEAT-QW4)
  statusHistory: StatusHistoryItem[] = [];
  statusHistoryLoading = false;

  // Clone state (FEAT-QW3)
  cloneTarget = '';
  cloning = false;
  cloneError: string | null = null;
  showClonePanel = false;

  // Attorney profile state (FEAT-QW1)
  attorneyProfile: AttorneyProfile | null = null;
  attorneyProfileLoading = false;

  // Family bundle state (FEAT-QW6)
  family: FamilyBundle | null = null;
  familyLoading = false;

  // H-1B cap state (FEAT-QW7)
  h1bCap: H1bCapRegistration | null = null;
  h1bCapLoading = false;
  showCapForm = false;
  capForm = { registrationYear: new Date().getFullYear(), registrationNumber: '', registrationDate: '' };
  capSubmitting = false;
  capError: string | null = null;
  showLotteryForm = false;
  lotteryForm = { selectedInLottery: true, selectionDate: '' };
  lotterySubmitting = false;
  lotteryError: string | null = null;

  // RFE state (FEAT-M2)
  rfes: CaseRfe[] = [];
  rfesLoading = false;
  rfesLoaded = false;
  showRfeForm = false;
  rfeForm: CreateRfeRequest = { issuedDate: '', responseDeadline: '', uscisCategory: '', uscisNote: '' };
  rfeSubmitting = false;
  rfeError: string | null = null;
  respondingRfeId: number | null = null;

  // Receipt number state
  showReceiptNumberPanel = false;
  receiptNumberDraft = '';
  savingReceiptNumber = false;
  receiptNumberError: string | null = null;

  // USCIS polling state (FEAT-M3)
  uscisHistory: UscisStatusResult[] = [];
  uscisLoading = false;
  checkingUscis = false;
  uscisError: string | null = null;

  // Priority date status (FEAT-M5)
  priorityDateStatus: PriorityDateStatus | null = null;
  priorityDateLoading = false;

  // Case report download (FEAT-M6)
  downloadingReport = false;
  downloadingTimeline = false;

  // Data requests (FEAT-M7)
  dataRequests: ProfileDataRequest[] = [];
  dataRequestsLoaded = false;
  showRequestDataPanel = false;
  sendingRequest = false;
  requestSent = false;
  requestError: string | null = null;
  newRequestForm: CreateDataRequestRequest = {
    targetRelationship: 'BENEFICIARY',
    sections: ['personalInfo', 'passportI94', 'currentStatus'],
    expiryDays: 14
  };

  readonly ALL_SECTIONS = [
    { id: 'personalInfo',           label: 'Personal Info' },
    { id: 'passportI94',            label: 'Passport & I-94' },
    { id: 'currentStatus',          label: 'Current Status' },
    { id: 'employment',             label: 'Employment' },
    { id: 'familyDependents',       label: 'Family / Dependents' },
    { id: 'eadInfo',                label: 'EAD Info' },
    { id: 'notificationPreferences', label: 'Notification Preferences' }
  ];

  // Checklist (FEAT-M8)
  checklist: ChecklistItem[] = [];
  checklistLoaded = false;
  generatingChecklist = false;
  checklistError: string | null = null;
  showGeneratePanel = false;
  generateFormTypes: string[] = [];
  checklistByCategory: Record<string, ChecklistItem[]> = {};
  expandedChecklistItem: number | null = null;
  updatingChecklistItem: number | null = null;
  checklistVaultDocs: { id: number; title: string }[] = [];
  checklistVaultDocsLoaded = false;
  waiverDraft: Record<number, string> = {};
  docPickerSelection: Record<number, number | null> = {};

  readonly FORM_TYPE_OPTIONS = [
    { id: 'I129',     label: 'I-129 (H-1B Petition)' },
    { id: 'I485',     label: 'I-485 (Adjustment of Status)' },
    { id: 'I140_EB2', label: 'I-140 EB-2' },
    { id: 'I140_EB3', label: 'I-140 EB-3' },
    { id: 'PERM',     label: 'PERM' },
  ];

  // Filing Packages tab state (Filing Package System)
  packages: FilingPackage[] = [];
  packagesLoaded = false;
  packagesLoading = false;
  packagesError: string | null = null;
  showCreatePackagePanel = false;
  newPackageName = '';
  newPackageFormTypes: string[] = [];
  creatingPackage = false;
  createPackageError: string | null = null;
  sendingQuestionnaires: number | null = null;  // packageId being sent
  approvingPackage: number | null = null;       // packageId being approved
  expandedPackage: number | null = null;

  // Pre-computed completeness entries keyed by packageId — prevents new-object-per-CD-cycle
  pkgCompletenessMap: Record<number, { owner: string; pct: number }[]> = {};

  // PDF generation state — keyed by packageId
  packets: Record<number, GeneratedPdfPacket[]> = {};
  generatingPdf: number | null = null;          // packageId
  generatePdfError: Record<number, string> = {};
  pendingReviewConflict: number | null = null;  // packageId awaiting override confirmation
  approvingPacket: number | null = null;        // packetId

  loadPackets(pkg: FilingPackage): void {
    this.immigrationService.listPdfPackets(this.caseId, pkg.id).subscribe({
      next: pts => { this.packets[pkg.id] = pts; },
      error: () => {}
    });
  }

  doGeneratePdf(pkg: FilingPackage, override = false): void {
    this.generatingPdf = pkg.id;
    this.generatePdfError[pkg.id] = '';
    this.pendingReviewConflict = null;
    this.immigrationService.generatePdfPacket(this.caseId, pkg.id, override).subscribe({
      next: packet => {
        this.packets[pkg.id] = [packet, ...(this.packets[pkg.id] || [])];
        const idx = this.packages.findIndex(p => p.id === pkg.id);
        if (idx >= 0) this.packages[idx].status = 'GENERATED';
        this.generatingPdf = null;
      },
      error: err => {
        const msg: string = err.error?.error || err.error?.message || err.message || 'Failed to generate PDF';
        if (msg.startsWith('PENDING_REVIEW_EXISTS')) {
          this.pendingReviewConflict = pkg.id;
        } else {
          this.generatePdfError[pkg.id] = msg;
        }
        this.generatingPdf = null;
      }
    });
  }

  downloadPacket(caseId: number, packageId: number, packetId: number): void {
    this.immigrationService.downloadPdfPacket(caseId, packageId, packetId);
  }

  doApprovePacket(caseId: number, packageId: number, packetId: number): void {
    this.approvingPacket = packetId;
    this.immigrationService.approvePdfPacket(caseId, packageId, packetId).subscribe({
      next: updated => {
        const list = this.packets[packageId] || [];
        const idx = list.findIndex(p => p.id === packetId);
        if (idx >= 0) list[idx] = updated;
        this.approvingPacket = null;
      },
      error: () => { this.approvingPacket = null; }
    });
  }

  togglePackageFormType(id: string): void {
    const idx = this.newPackageFormTypes.indexOf(id);
    if (idx >= 0) this.newPackageFormTypes.splice(idx, 1);
    else this.newPackageFormTypes.push(id);
  }

  isPackageFormTypeSelected(id: string): boolean {
    return this.newPackageFormTypes.includes(id);
  }

  loadPackages(): void {
    if (this.packagesLoaded) return;
    this.packagesLoading = true;
    this.immigrationService.listPackages(this.caseId).subscribe({
      next: pkgs => {
        this.packages = pkgs;
        this.cacheCompletenessEntries(pkgs);
        this.packagesLoaded = true;
        this.packagesLoading = false;
        pkgs.filter(p => p.status === 'GENERATED' || p.status === 'ATTORNEY_APPROVED')
            .forEach(p => this.loadPackets(p));
      },
      error: err => {
        this.packagesError = err.error?.error || err.error?.message || 'Failed to load filing packages';
        this.packagesLoading = false;
      }
    });
  }

  doCreatePackage(): void {
    if (!this.newPackageName.trim() || this.newPackageFormTypes.length === 0) {
      this.createPackageError = 'Package name and at least one form type are required.';
      return;
    }
    this.creatingPackage = true;
    this.createPackageError = null;
    this.immigrationService.createPackage(this.caseId, {
      name: this.newPackageName.trim(),
      selectedFormTypes: [...this.newPackageFormTypes]
    }).subscribe({
      next: pkg => {
        this.packages.unshift(pkg);
        this.cacheCompletenessEntries([pkg]);
        this.showCreatePackagePanel = false;
        this.newPackageName = '';
        this.newPackageFormTypes = [];
        this.creatingPackage = false;
      },
      error: err => {
        this.createPackageError = err.error?.error || err.error?.message || 'Failed to create package';
        this.creatingPackage = false;
      }
    });
  }

  doSendQuestionnaires(pkg: FilingPackage): void {
    this.sendingQuestionnaires = pkg.id;
    this.immigrationService.sendQuestionnaires(this.caseId, pkg.id).subscribe({
      next: updated => {
        const idx = this.packages.findIndex(p => p.id === pkg.id);
        if (idx >= 0) this.packages[idx] = updated;
        this.cacheCompletenessEntries([updated]);
        this.sendingQuestionnaires = null;
      },
      error: () => { this.sendingQuestionnaires = null; }
    });
  }

  doApprovePackage(pkg: FilingPackage): void {
    this.approvingPackage = pkg.id;
    this.immigrationService.approvePackageAnswers(this.caseId, pkg.id).subscribe({
      next: updated => {
        const idx = this.packages.findIndex(p => p.id === pkg.id);
        if (idx >= 0) this.packages[idx] = updated;
        this.cacheCompletenessEntries([updated]);
        this.approvingPackage = null;
      },
      error: () => { this.approvingPackage = null; }
    });
  }

  packageStatusCss(status: string): string {
    switch (status) {
      case 'DRAFT':               return 'badge-draft';
      case 'QUESTIONNAIRES_SENT': return 'badge-sent';
      case 'ANSWERS_COLLECTED':   return 'badge-collected';
      case 'ATTORNEY_REVIEW':     return 'badge-review';
      case 'APPROVED':            return 'badge-approved';
      case 'GENERATED':           return 'badge-generated';
      case 'FILED':               return 'badge-filed';
      default:                    return 'badge-draft';
    }
  }

  questionnaireLink(token: string): string {
    return `/immigration/packages/questionnaire/${token}`;
  }

  private cacheCompletenessEntries(pkgs: FilingPackage[]): void {
    pkgs.forEach(pkg => {
      this.pkgCompletenessMap[pkg.id] = Object.entries(pkg.completenessPercent || {})
          .map(([owner, pct]) => ({ owner, pct }));
    });
  }

  trackPackageById(_: number, pkg: FilingPackage): number { return pkg.id; }
  trackEntryByOwner(_: number, e: { owner: string; pct: number }): string { return e.owner; }

  // Tasks tab state (FEAT-QW8)
  tasks: CaseTask[] = [];
  tasksLoading = false;
  tasksLoaded = false;
  tasksError: string | null = null;
  showAddTask = false;
  addingTask = false;
  addTaskError: string | null = null;
  taskForm: CreateCaseTaskRequest = { title: '', description: '', dueDate: '', isRequired: false };
  editingTaskId: number | null = null;
  editTaskForm: CreateCaseTaskRequest = { title: '', description: '', dueDate: '', isRequired: false };

  // Key dates state
  keyDates: KeyDate[] = [];
  keyDatesLoading = true;
  syncingKeyDates = false;

  // Activity feed state
  feed: ActivityFeedItem[] = [];
  feedLoading = false;
  feedLoaded = false;

  // Consent modal state
  showConsentModal = false;
  consentChecked = false;
  submittingConsent = false;
  consentError: string | null = null;
  consentRecords: ConsentRecord[] = [];

  // Messaging state
  messages: ImmMessage[] = [];
  msgChannel = 'SHARED';
  msgLoading = false;
  msgError: string | null = null;
  msgContent = '';
  sendingMsg = false;
  unreadCounts: Record<string, number> = {};

  // Timeline tab state
  timeline: TimelineItem[] = [];
  timelineLoading = false;
  timelineError: string | null = null;
  timelineLoaded = false;
  showAddEvent = false;
  showAddAppt = false;
  addingEvent = false;
  addingAppt = false;

  eventForm = { eventType: 'NOTE', eventDate: '', title: '', description: '' };
  apptForm  = { appointmentType: 'ATTORNEY_MEETING', scheduledAt: '', location: '', notes: '' };

  readonly eventTypes = [
    'NOTE','STATUS_CHANGED','DOCUMENT_UPLOADED','RFE_RECEIVED',
    'PETITION_FILED','BIOMETRICS_COMPLETED','INTERVIEW_ATTENDED','VISA_ISSUED','OTHER'
  ];
  readonly apptTypes = ['ATTORNEY_MEETING','USCIS_INTERVIEW','BIOMETRICS','CONSULATE_INTERVIEW','OTHER'];

  // ── Paralegal state ───────────────────────────────────────────────────────
  firmMembers: ImmOrgMember[] = [];
  paralegalTarget: number | '' = '';
  assigningParalegal = false;
  paralegalError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immigrationService: ImmigrationService,
    private immOrgService: ImmOrgService,
    private logger: LoggerService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.caseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCase();
  }

  loadCase(): void {
    this.caseLoading = true;
    this.immigrationService.getCase(this.caseId).subscribe({
      next: c => {
        this.case = c;
        this.caseLoading = false;
        this.loadKeyDates();
        this.loadFeed();
        this.loadStatusHistory();
        this.loadFamily();
        this.loadRfes();
        if (c.caseType === 'H1B_INITIAL') this.loadH1bCap();
        if (c.receiptNumber) this.loadUscisHistory();
        if (this.isEbCaseType(c.caseType)) this.loadPriorityDateStatus();
        if (c.callerRelationship === 'BENEFICIARY') {
          this.checkAndShowConsent();
        }
        if (c.callerRelationship === 'ATTORNEY' && c.lawFirmImmOrgId) {
          this.loadFirmMembers(c.lawFirmImmOrgId);
          this.loadAttorneyProfile(c.lawFirmImmOrgId);
        }
      },
      error: err => {
        this.caseError = err?.error?.error || 'Failed to load case';
        this.caseLoading = false;
        this.logger.error(this.source, 'loadCase failed', err);
      }
    });
  }

  loadKeyDates(): void {
    this.keyDatesLoading = true;
    this.immigrationService.getKeyDates(this.caseId).subscribe({
      next: kd => { this.keyDates = kd; this.keyDatesLoading = false; },
      error: () => { this.keyDatesLoading = false; }
    });
  }

  syncKeyDates(): void {
    this.syncingKeyDates = true;
    this.immigrationService.syncKeyDates(this.caseId).subscribe({
      next: kd => { this.keyDates = kd; this.syncingKeyDates = false; },
      error: () => { this.syncingKeyDates = false; }
    });
  }

  urgencyCss(u: string): string {
    return u === 'OVERDUE' ? 'kd-overdue' : u === 'DUE_SOON' ? 'kd-soon' : 'kd-upcoming';
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'forms'     && !this.formsLoaded)     this.loadForms();
    if (tab === 'timeline'  && !this.timelineLoaded)  this.loadTimeline();
    if (tab === 'messaging') { this.loadMessages(); this.loadUnreadCounts(); }
    if (tab === 'profile')    this.loadBeneficiaryProfile();
    if (tab === 'tasks'     && !this.tasksLoaded)     this.loadTasks();
    if (tab === 'packages'  && !this.packagesLoaded)  this.loadPackages();
    if (tab === 'documents' && this.isBeneficiary && !this.checklistLoaded) this.loadChecklist();
  }

  // ── Role helpers ──────────────────────────────────────────────────────────
  get isBeneficiary():        boolean { return this.case?.callerRelationship === 'BENEFICIARY'; }
  get isAttorney():           boolean { return this.case?.callerRelationship === 'ATTORNEY'; }
  get isParalegal():          boolean { return this.case?.callerRelationship === 'PARALEGAL'; }
  get isEmployer():           boolean { return this.case?.callerRelationship === 'HR_ADMIN'; }
  get isAttorneyOrParalegal():boolean { return this.isAttorney || this.isParalegal; }
  get isOrgMember():          boolean { return this.isAttorney || this.isParalegal || this.isEmployer; }

  // ── Profile tab helpers (attorney view) ───────────────────────────────────
  openDataRequestFromProfile(): void {
    this.setTab('overview');
    this.showRequestDataPanel = true;
    this.loadDataRequests();
  }

  visaExpiryBadgeCss(expiry: string | null | undefined): string {
    if (!expiry) return 'bg-secondary';
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
    if (days < 0) return 'bg-danger';
    if (days <= 90) return 'bg-warning text-dark';
    return 'bg-success';
  }

  visaExpiryLabel(expiry: string | null | undefined): string {
    if (!expiry) return 'no expiry on file';
    const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return 'Expired';
    if (days <= 90) return `Expires in ${days}d`;
    return 'Valid';
  }

  profileCompleteness(profile: CanonicalProfile): number {
    let score = 0;
    if (profile.legalFirstName && profile.legalLastName) score++;
    if (profile.dateOfBirth || profile.countryOfBirth || profile.citizenshipCountry) score++;
    if (profile.gender || profile.phone) score++;
    if (profile.currentAddress?.line1) score++;
    if (profile.passports?.length) score++;
    if (profile.travelEntries?.length) score++;
    if (profile.currentVisaType) score++;
    if (profile.employment?.length) score++;
    return Math.round((score / 8) * 100);
  }

  // ── Beneficiary profile (for employer / attorney view) ────────────────────
  beneficiaryProfile: CanonicalProfile | null = null;
  profileLoading = false;
  profileError: string | null = null;
  profileLoaded = false;
  profileTab = 'bio';

  setProfileTab(tab: string): void { this.profileTab = tab; }

  downloadProfileDoc(docId: number, name: string): void {
    this.immigrationService.downloadCaseProfileDoc(this.caseId, docId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name || `document-${docId}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  loadBeneficiaryProfile(): void {
    if (this.profileLoaded || this.profileLoading) return;
    this.profileLoading = true;
    this.profileError = null;
    this.immigrationService.getCaseBeneficiaryProfile(this.caseId).subscribe({
      next: p => { this.beneficiaryProfile = p; this.profileLoading = false; this.profileLoaded = true; },
      error: err => {
        this.profileError = err?.error?.error || 'Profile not available yet.';
        this.profileLoading = false;
      }
    });
  }

  // ── Scope helpers (driven by callerRelationship from the DTO) ────────────

  canSeeForms(): boolean {
    return this.isAttorney;
  }

  visibleChannels(): string[] {
    const rel = this.case?.callerRelationship;
    if (rel === 'ATTORNEY') return ['SHARED', 'ATTORNEY_BENEFICIARY', 'ATTORNEY_EMPLOYER', 'ATTORNEY_INTERNAL'];
    if (rel === 'PARALEGAL') return ['SHARED', 'ATTORNEY_BENEFICIARY', 'ATTORNEY_EMPLOYER', 'ATTORNEY_INTERNAL'];
    if (rel === 'HR_ADMIN')  return ['SHARED', 'ATTORNEY_EMPLOYER'];
    return ['SHARED', 'ATTORNEY_BENEFICIARY'];
  }

  // ── Consent modal ─────────────────────────────────────────────────────────

  checkAndShowConsent(): void {
    this.immigrationService.getConsent(this.caseId).subscribe({
      next: recs => {
        this.consentRecords = recs;
        const hasActiveConsent = recs.some(r => r.granted);
        if (!hasActiveConsent) {
          this.showConsentModal = true;
        }
      },
      error: () => {
        this.showConsentModal = true;
      }
    });
  }

  submitConsent(): void {
    if (!this.consentChecked) return;
    this.submittingConsent = true;
    this.consentError = null;

    // BENEFICIARY self-consent is always included — this is the "terms acknowledged" record
    // that checkAndShowConsent() uses to skip the modal on subsequent visits.
    const calls: Observable<ConsentRecord>[] = [
      this.immigrationService.grantConsent(this.caseId, 'BENEFICIARY')
    ];
    if (this.case?.lawFirmImmOrgId) {
      calls.push(this.immigrationService.grantConsent(this.caseId, 'ATTORNEY'));
    }
    if (this.case?.employerImmOrgId) {
      calls.push(this.immigrationService.grantConsent(this.caseId, 'HR_ADMIN'));
    }

    forkJoin(calls).subscribe({
      next: recs => {
        this.consentRecords = [...recs, ...this.consentRecords];
        this.showConsentModal = false;
        this.submittingConsent = false;
      },
      error: err => {
        this.consentError = err?.error?.error || 'Failed to record consent. Please try again.';
        this.submittingConsent = false;
        this.logger.error(this.source, 'submitConsent failed', err);
      }
    });
  }

  declineConsent(): void {
    this.router.navigate(['/immigration']);
  }

  // ── Timeline tab ──────────────────────────────────────────────────────────

  loadTimeline(): void {
    this.timelineLoading = true;
    this.timelineError = null;
    this.immigrationService.getTimeline(this.caseId).subscribe({
      next: items => { this.timeline = items; this.timelineLoading = false; this.timelineLoaded = true; },
      error: err => {
        this.timelineError = err?.error?.error || 'Failed to load timeline';
        this.timelineLoading = false;
        this.logger.error(this.source, 'loadTimeline failed', err);
      }
    });
  }

  submitEvent(): void {
    if (!this.eventForm.eventDate || !this.eventForm.title) return;
    this.addingEvent = true;
    this.immigrationService.createEvent(this.caseId, this.eventForm).subscribe({
      next: item => {
        this.timeline = [item, ...this.timeline];
        this.showAddEvent = false;
        this.eventForm = { eventType: 'NOTE', eventDate: '', title: '', description: '' };
        this.addingEvent = false;
      },
      error: err => { this.addingEvent = false; this.logger.error(this.source, 'createEvent failed', err); }
    });
  }

  submitAppt(): void {
    if (!this.apptForm.scheduledAt) return;
    this.addingAppt = true;
    this.immigrationService.createAppointment(this.caseId, this.apptForm).subscribe({
      next: item => {
        this.timeline = [item, ...this.timeline];
        this.showAddAppt = false;
        this.apptForm = { appointmentType: 'ATTORNEY_MEETING', scheduledAt: '', location: '', notes: '' };
        this.addingAppt = false;
      },
      error: err => { this.addingAppt = false; this.logger.error(this.source, 'createAppointment failed', err); }
    });
  }

  deleteTimelineItem(item: TimelineItem): void {
    const obs = item.itemType === 'EVENT'
      ? this.immigrationService.deleteEvent(this.caseId, item.id)
      : this.immigrationService.deleteAppointment(this.caseId, item.id);
    obs.subscribe({ next: () => { this.timeline = this.timeline.filter(i => !(i.id === item.id && i.itemType === item.itemType)); } });
  }

  iconFor(item: TimelineItem): string {
    return this.eventTypeIcons[item.eventType] || (item.itemType === 'APPOINTMENT' ? 'bi-calendar-event' : 'bi-circle');
  }

  // ── Forms tab ─────────────────────────────────────────────────────────────

  loadForms(): void {
    this.formsLoading = true;
    this.formsError = null;
    this.immigrationService.getForms(this.caseId).subscribe({
      next: forms => {
        this.forms = forms;
        this._fieldCache.clear();
        this.formsLoading = false;
        this.formsLoaded = true;
      },
      error: err => {
        this.formsError = err?.error?.error || 'Failed to load forms';
        this.formsLoading = false;
        this.logger.error(this.source, 'loadForms failed', err);
      }
    });
  }

  generateForms(): void {
    this.generatingForms = true;
    this.formsError = null;
    this.immigrationService.generateForms(this.caseId).subscribe({
      next: forms => {
        this.forms = forms;
        this._fieldCache.clear();
        this.expandedFormId = null;
        this.formsLoaded = true;
        this.generatingForms = false;
      },
      error: err => {
        this.formsError = err?.error?.error || 'Failed to generate forms';
        this.generatingForms = false;
        this.logger.error(this.source, 'generateForms failed', err);
      }
    });
  }

  toggleFieldView(id: number): void {
    if (this.expandedFormId === id) {
      this.expandedFormId = null;
    } else {
      this.expandedFormId = id;
      if (!this._fieldCache.has(id)) {
        const form = this.forms.find(f => f.id === id);
        this._fieldCache.set(id, form ? this.computeEntries(form) : []);
      }
    }
  }

  getFieldEntries(id: number): { key: string; value: string }[] {
    return this._fieldCache.get(id) ?? [];
  }

  private computeEntries(form: FormInstance): { key: string; value: string }[] {
    if (!form.fieldData) return [];
    return Object.entries(form.fieldData)
      .filter(([, v]) => v != null)
      .map(([k, v]) => ({ key: this.humanKey(k), value: String(v) }));
  }

  private humanKey(k: string): string {
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  // ── Activity feed ─────────────────────────────────────────────────────────

  loadFeed(): void {
    if (this.feedLoading) return;
    this.feedLoading = true;
    this.immigrationService.getActivityFeed(this.caseId).subscribe({
      next: items => { this.feed = items; this.feedLoading = false; this.feedLoaded = true; },
      error: () => { this.feedLoading = false; }
    });
  }

  // ── Paralegal assignment (attorney view) ─────────────────────────────────

  loadFirmMembers(orgId: number): void {
    this.immOrgService.listMembers(orgId).subscribe({
      next: members => {
        this.firmMembers = members.filter(m => m.status === 'ACTIVE');
        if (this.case?.assignedParalegalMemberId) {
          this.paralegalTarget = this.case.assignedParalegalMemberId;
        }
      },
      error: () => {}
    });
  }

  doAssignParalegal(): void {
    this.assigningParalegal = true;
    this.paralegalError = null;
    const memberId = this.paralegalTarget === '' ? null : Number(this.paralegalTarget);
    this.immigrationService.assignParalegal(this.caseId, memberId).subscribe({
      next: updated => {
        this.case = updated;
        this.assigningParalegal = false;
      },
      error: err => {
        this.paralegalError = err?.error?.error || 'Failed to assign paralegal';
        this.assigningParalegal = false;
      }
    });
  }

  // ── Form share dialog (attorney view) ────────────────────────────────────

  formSharePanel: { formId: number; formLabel: string; email: string; recipientType: string; expiryDays: number; sharing: boolean; shareUrl: string | null; error: string | null } | null = null;

  openFormShare(form: { id: number; formTypeLabel: string }): void {
    const prefill = this.case?.assignedAttorneyEmail ? '' : '';
    this.formSharePanel = {
      formId: form.id,
      formLabel: form.formTypeLabel,
      email: prefill,
      recipientType: 'BENEFICIARY',
      expiryDays: 7,
      sharing: false,
      shareUrl: null,
      error: null
    };
  }

  closeFormShare(): void { this.formSharePanel = null; }

  submitFormShare(): void {
    if (!this.formSharePanel || !this.formSharePanel.email.trim()) return;
    const p = this.formSharePanel;
    p.sharing = true;
    p.error = null;
    this.immigrationService.shareForm(this.caseId, p.formId, {
      recipientEmail: p.email.trim(),
      recipientType: p.recipientType,
      expiryDays: p.expiryDays
    }).subscribe({
      next: share => {
        p.shareUrl = `${window.location.origin}/immigration/forms/shared/${share.token}`;
        p.sharing = false;
      },
      error: err => {
        p.error = err?.error?.error || 'Share failed';
        p.sharing = false;
      }
    });
  }

  copyFormShareUrl(): void {
    if (this.formSharePanel?.shareUrl) {
      navigator.clipboard.writeText(this.formSharePanel.shareUrl).catch(() => {});
    }
  }

  // ── Case progress tracker ─────────────────────────────────────────────────

  readonly TRACKER_STEPS: { key: string; label: string; icon: string }[] = [
    { key: 'PROSPECTIVE',         label: 'Prospective',  icon: 'bi-person-plus' },
    { key: 'DATA_COLLECTION',     label: 'Data Collect', icon: 'bi-clipboard-data' },
    { key: 'PETITION_FILED',      label: 'Filed',        icon: 'bi-send' },
    { key: 'PETITION_APPROVED',   label: 'Approved',     icon: 'bi-patch-check' },
    { key: 'DS160_FILED',         label: 'DS-160',       icon: 'bi-file-earmark-text' },
    { key: 'INTERVIEW_SCHEDULED', label: 'Interview',    icon: 'bi-calendar-event' },
    { key: 'VISA_ISSUED',         label: 'Visa Issued',  icon: 'bi-credit-card-2-front' },
    { key: 'ADMITTED',            label: 'Admitted',     icon: 'bi-airplane' },
    { key: 'CLOSED',              label: 'Complete',     icon: 'bi-house-check' },
  ];

  private readonly STATUS_STEP_INDEX: Record<string, number> = {
    PROSPECTIVE:         0,
    DATA_COLLECTION:     1,
    PETITION_FILED:      2,
    RFE_PENDING:         2,
    PETITION_APPROVED:   3,
    DS160_FILED:         4,
    INTERVIEW_SCHEDULED: 5,
    VISA_ISSUED:         6,
    ADMITTED:            7,
    CLOSED:              9,
  };

  get trackerCurrentIndex(): number {
    if (!this.case) return -1;
    return this.STATUS_STEP_INDEX[this.case.status] ?? -1;
  }

  get isTerminalStatus(): boolean {
    return this.case?.status === 'DENIED' || this.case?.status === 'WITHDRAWN';
  }

  isStepDone(stepIdx: number): boolean {
    if (!this.case || this.isTerminalStatus) return false;
    return stepIdx < this.trackerCurrentIndex;
  }

  isStepActive(stepIdx: number): boolean {
    if (!this.case || this.isTerminalStatus) return false;
    return stepIdx === this.trackerCurrentIndex;
  }

  isRfeStep(stepIdx: number): boolean {
    return stepIdx === 2 && this.case?.status === 'RFE_PENDING';
  }

  // ── Status change (attorney / HR_ADMIN) ──────────────────────────────────

  private readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    PROSPECTIVE:         ['DATA_COLLECTION', 'WITHDRAWN'],
    DATA_COLLECTION:     ['PETITION_FILED', 'WITHDRAWN'],
    PETITION_FILED:      ['RFE_PENDING', 'PETITION_APPROVED', 'DENIED', 'WITHDRAWN'],
    RFE_PENDING:         ['PETITION_APPROVED', 'DENIED', 'WITHDRAWN'],
    PETITION_APPROVED:   ['DS160_FILED', 'INTERVIEW_SCHEDULED', 'VISA_ISSUED', 'CLOSED', 'WITHDRAWN'],
    DS160_FILED:         ['INTERVIEW_SCHEDULED', 'DENIED', 'WITHDRAWN'],
    INTERVIEW_SCHEDULED: ['VISA_ISSUED', 'DENIED', 'WITHDRAWN'],
    VISA_ISSUED:         ['ADMITTED', 'CLOSED'],
    ADMITTED:            ['CLOSED'],
    CLOSED: [], DENIED: [], WITHDRAWN: [],
  };

  statusChangeTarget = '';
  updatingStatus = false;
  statusUpdateError: string | null = null;

  allowedTransitions(): string[] {
    if (!this.case) return [];
    return this.STATUS_TRANSITIONS[this.case.status] ?? [];
  }

  doStatusUpdate(): void {
    if (!this.statusChangeTarget || !this.case) return;
    this.updatingStatus = true;
    this.statusUpdateError = null;
    this.immigrationService.updateStatus(this.caseId, this.statusChangeTarget).subscribe({
      next: updated => {
        this.case = updated;
        this.statusChangeTarget = '';
        this.updatingStatus = false;
        this.loadFeed();
      },
      error: err => {
        this.statusUpdateError = err?.error?.error || 'Status update failed';
        this.updatingStatus = false;
      }
    });
  }

  private readonly FILED_STATUSES = new Set([
    'PETITION_FILED', 'RFE_PENDING', 'PETITION_APPROVED',
    'DS160_FILED', 'INTERVIEW_SCHEDULED', 'VISA_ISSUED', 'ADMITTED', 'CLOSED'
  ]);

  isPetitionFiled(): boolean {
    return !!this.case && this.FILED_STATUSES.has(this.case.status);
  }

  openReceiptNumberPanel(): void {
    this.receiptNumberDraft = this.case?.receiptNumber || '';
    this.receiptNumberError = null;
    this.showReceiptNumberPanel = true;
  }

  doUpdateReceiptNumber(): void {
    if (!this.receiptNumberDraft.trim()) return;
    this.savingReceiptNumber = true;
    this.receiptNumberError = null;
    this.immigrationService.updateReceiptNumber(this.caseId, this.receiptNumberDraft.trim()).subscribe({
      next: updated => {
        this.case = updated;
        this.showReceiptNumberPanel = false;
        this.savingReceiptNumber = false;
        this.loadUscisHistory();
      },
      error: err => {
        this.receiptNumberError = err?.error?.error || 'Failed to save receipt number';
        this.savingReceiptNumber = false;
      }
    });
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  setMsgChannel(ch: string): void {
    this.msgChannel = ch;
    this.loadMessages();
  }

  loadMessages(): void {
    this.msgLoading = true;
    this.msgError = null;
    this.immigrationService.getMessages(this.caseId, this.msgChannel).subscribe({
      next: msgs => {
        this.messages = msgs;
        this.msgLoading = false;
        this.markChannelRead(this.msgChannel);
      },
      error: err => {
        this.msgError = err?.error?.error || 'Failed to load messages';
        this.msgLoading = false;
        this.logger.error(this.source, 'loadMessages failed', err);
      }
    });
  }

  markChannelRead(channel: string): void {
    this.immigrationService.markMessagesRead(this.caseId, channel).subscribe({
      next: () => { this.unreadCounts = { ...this.unreadCounts, [channel]: 0 }; },
      error: () => {}
    });
  }

  loadUnreadCounts(): void {
    this.immigrationService.getUnreadCounts(this.caseId).subscribe({
      next: counts => { this.unreadCounts = counts; },
      error: () => {}
    });
  }

  totalUnread(): number {
    return Object.values(this.unreadCounts).reduce((sum, n) => sum + (n || 0), 0);
  }

  sendMessage(): void {
    if (!this.msgContent.trim()) return;
    this.sendingMsg = true;
    this.immigrationService.sendMessage(this.caseId, this.msgChannel, this.msgContent.trim()).subscribe({
      next: msg => { this.messages = [...this.messages, msg]; this.msgContent = ''; this.sendingMsg = false; },
      error: err => { this.sendingMsg = false; this.logger.error(this.source, 'sendMessage failed', err); }
    });
  }

  // ── Status history (FEAT-QW4) ─────────────────────────────────────────────

  loadStatusHistory(): void {
    this.statusHistoryLoading = true;
    this.immigrationService.getStatusHistory(this.caseId).subscribe({
      next: h => { this.statusHistory = h; this.statusHistoryLoading = false; },
      error: () => { this.statusHistoryLoading = false; }
    });
  }

  statusLabel(s: string | null): string {
    return s ? (this.statusLabels[s] ?? s) : '—';
  }

  // ── Case clone (FEAT-QW3) ─────────────────────────────────────────────────

  doClone(): void {
    if (!this.cloneTarget) return;
    this.cloning = true;
    this.cloneError = null;
    this.immigrationService.cloneCase(this.caseId, this.cloneTarget).subscribe({
      next: newCase => {
        this.cloning = false;
        this.showClonePanel = false;
        this.router.navigate(['/immigration/cases', newCase.id]);
      },
      error: err => {
        this.cloneError = err?.error?.error || 'Clone failed';
        this.cloning = false;
        this.logger.error(this.source, 'cloneCase failed', err);
      }
    });
  }

  // ── Attorney profile (FEAT-QW1) ───────────────────────────────────────────

  loadAttorneyProfile(orgId: number): void {
    this.attorneyProfileLoading = true;
    this.immigrationService.getAttorneyProfile(orgId).subscribe({
      next: p => { this.attorneyProfile = p; this.attorneyProfileLoading = false; },
      error: () => { this.attorneyProfileLoading = false; }
    });
  }

  // ── H-1B cap / lottery (FEAT-QW7) ────────────────────────────────────────

  loadH1bCap(): void {
    this.h1bCapLoading = true;
    this.immigrationService.getH1bCap(this.caseId).subscribe({
      next: cap => { this.h1bCap = cap; this.h1bCapLoading = false; },
      error: () => { this.h1bCapLoading = false; }
    });
  }

  submitCap(): void {
    if (!this.capForm.registrationDate) return;
    this.capSubmitting = true;
    this.capError = null;
    this.immigrationService.createH1bCap(this.caseId, {
      registrationYear: this.capForm.registrationYear,
      registrationNumber: this.capForm.registrationNumber || undefined,
      registrationDate: this.capForm.registrationDate
    }).subscribe({
      next: cap => { this.h1bCap = cap; this.showCapForm = false; this.capSubmitting = false; },
      error: err => { this.capError = err?.error?.error || 'Failed to save registration'; this.capSubmitting = false; }
    });
  }

  submitLotteryResult(): void {
    this.lotterySubmitting = true;
    this.lotteryError = null;
    this.immigrationService.updateLotteryResult(this.caseId, {
      selectedInLottery: this.lotteryForm.selectedInLottery,
      selectionDate: this.lotteryForm.selectionDate || null
    }).subscribe({
      next: cap => { this.h1bCap = cap; this.showLotteryForm = false; this.lotterySubmitting = false; },
      error: err => { this.lotteryError = err?.error?.error || 'Failed to update result'; this.lotterySubmitting = false; }
    });
  }

  // ── Tasks (FEAT-QW8) ─────────────────────────────────────────────────────

  loadTasks(): void {
    this.tasksLoading = true;
    this.tasksError = null;
    this.immigrationService.listTasks(this.caseId).subscribe({
      next: t => { this.tasks = t; this.tasksLoading = false; this.tasksLoaded = true; },
      error: err => { this.tasksError = err?.error?.error || 'Failed to load tasks'; this.tasksLoading = false; }
    });
  }

  overdueTaskCount(): number {
    return this.tasks.filter(t => t.overdue && !t.completedAt).length;
  }

  submitAddTask(): void {
    if (!this.taskForm.title?.trim()) return;
    this.addingTask = true;
    this.addTaskError = null;
    this.immigrationService.createTask(this.caseId, {
      ...this.taskForm,
      dueDate: this.taskForm.dueDate || undefined
    }).subscribe({
      next: t => {
        this.tasks = [...this.tasks, t];
        this.showAddTask = false;
        this.taskForm = { title: '', description: '', dueDate: '', isRequired: false };
        this.addingTask = false;
      },
      error: err => { this.addTaskError = err?.error?.error || 'Failed to create task'; this.addingTask = false; }
    });
  }

  startEditTask(t: CaseTask): void {
    this.editingTaskId = t.id;
    this.editTaskForm = { title: t.title, description: t.description || '', dueDate: t.dueDate || '', isRequired: t.isRequired };
  }

  cancelEditTask(): void { this.editingTaskId = null; }

  saveEditTask(taskId: number): void {
    this.immigrationService.updateTask(this.caseId, taskId, {
      ...this.editTaskForm,
      dueDate: this.editTaskForm.dueDate || undefined
    }).subscribe({
      next: updated => {
        this.tasks = this.tasks.map(t => t.id === taskId ? updated : t);
        this.editingTaskId = null;
      },
      error: err => { this.logger.error(this.source, 'updateTask failed', err); }
    });
  }

  doCompleteTask(taskId: number): void {
    this.immigrationService.completeTask(this.caseId, taskId).subscribe({
      next: updated => { this.tasks = this.tasks.map(t => t.id === taskId ? updated : t); },
      error: err => { this.logger.error(this.source, 'completeTask failed', err); }
    });
  }

  doDeleteTask(taskId: number): void {
    this.immigrationService.deleteTask(this.caseId, taskId).subscribe({
      next: () => { this.tasks = this.tasks.filter(t => t.id !== taskId); },
      error: err => { this.logger.error(this.source, 'deleteTask failed', err); }
    });
  }

  // ── Family bundle (FEAT-QW6) ──────────────────────────────────────────────

  loadFamily(): void {
    this.familyLoading = true;
    this.immigrationService.getCaseFamily(this.caseId).subscribe({
      next: f => { this.family = f; this.familyLoading = false; },
      error: () => { this.familyLoading = false; }
    });
  }

  barNumbersList(): { state: string; barNumber: string; admittedDate?: string }[] {
    if (!this.attorneyProfile?.barNumbers) return [];
    return Array.isArray(this.attorneyProfile.barNumbers)
      ? this.attorneyProfile.barNumbers as { state: string; barNumber: string; admittedDate?: string }[]
      : [];
  }

  // ── RFE (FEAT-M2) ────────────────────────────────────────────────────────

  get openRfe(): CaseRfe | null {
    return this.rfes.find(r => r.status === 'OPEN') ?? null;
  }

  loadRfes(): void {
    this.rfesLoading = true;
    this.immigrationService.listRfes(this.caseId).subscribe({
      next: r => { this.rfes = r; this.rfesLoading = false; this.rfesLoaded = true; },
      error: () => { this.rfesLoading = false; }
    });
  }

  submitRfe(): void {
    if (!this.rfeForm.issuedDate) return;
    this.rfeSubmitting = true;
    this.rfeError = null;
    this.immigrationService.createRfe(this.caseId, this.rfeForm).subscribe({
      next: rfe => {
        this.rfes = [rfe, ...this.rfes];
        this.showRfeForm = false;
        this.rfeForm = { issuedDate: '', responseDeadline: '', uscisCategory: '', uscisNote: '' };
        this.rfeSubmitting = false;
        this.loadKeyDates();
      },
      error: err => {
        this.rfeError = err?.error?.error || 'Failed to log RFE';
        this.rfeSubmitting = false;
      }
    });
  }

  doRespondRfe(rfeId: number): void {
    this.respondingRfeId = rfeId;
    this.immigrationService.respondRfe(this.caseId, rfeId).subscribe({
      next: updated => {
        this.rfes = this.rfes.map(r => r.id === rfeId ? updated : r);
        this.respondingRfeId = null;
      },
      error: err => {
        this.logger.error(this.source, 'respondRfe failed', err);
        this.respondingRfeId = null;
      }
    });
  }

  // ── USCIS polling (FEAT-M3) ──────────────────────────────────────────────

  get uscisLastCheck(): UscisStatusResult | null {
    return this.uscisHistory.length > 0 ? this.uscisHistory[0] : null;
  }

  loadUscisHistory(): void {
    this.uscisLoading = true;
    this.immigrationService.getUscisHistory(this.caseId).subscribe({
      next: h => { this.uscisHistory = h; this.uscisLoading = false; },
      error: () => { this.uscisLoading = false; }
    });
  }

  checkUscisNow(): void {
    this.checkingUscis = true;
    this.uscisError = null;
    this.immigrationService.checkUscisNow(this.caseId).subscribe({
      next: result => {
        this.uscisHistory = [result, ...this.uscisHistory];
        this.checkingUscis = false;
      },
      error: err => {
        this.uscisError = err?.error?.error || 'USCIS check failed';
        this.checkingUscis = false;
      }
    });
  }

  // ── Data requests (FEAT-M7) ──────────────────────────────────────────────

  loadDataRequests(): void {
    if (this.dataRequestsLoaded) return;
    this.immigrationService.listDataRequests(this.caseId).subscribe({
      next: reqs => { this.dataRequests = reqs; this.dataRequestsLoaded = true; },
      error: () => {}
    });
  }

  isSectionSelected(id: string): boolean {
    return this.newRequestForm.sections.includes(id);
  }

  toggleSection(id: string): void {
    const idx = this.newRequestForm.sections.indexOf(id);
    if (idx >= 0) {
      this.newRequestForm.sections = this.newRequestForm.sections.filter(s => s !== id);
    } else {
      this.newRequestForm.sections = [...this.newRequestForm.sections, id];
    }
  }

  sendDataRequest(): void {
    if (!this.newRequestForm.sections.length) return;
    this.sendingRequest = true;
    this.requestError = null;
    this.immigrationService.createDataRequest(this.caseId, this.newRequestForm).subscribe({
      next: req => {
        this.dataRequests = [req, ...this.dataRequests];
        this.dataRequestsLoaded = true;
        this.showRequestDataPanel = false;
        this.requestSent = true;
        this.sendingRequest = false;
        this.newRequestForm = {
          targetRelationship: 'BENEFICIARY',
          sections: ['personalInfo', 'passportI94', 'currentStatus'],
          expiryDays: 14
        };
      },
      error: err => {
        this.requestError = err?.error?.error || 'Failed to send request';
        this.sendingRequest = false;
      }
    });
  }

  dataRequestLink(token: string): string {
    return `${window.location.origin}/immigration/data-request/${token}`;
  }

  copyRequestLink(token: string): void {
    navigator.clipboard.writeText(this.dataRequestLink(token)).catch(() => {});
  }

  dataRequestStatusCss(status: string): string {
    return status === 'SUBMITTED' ? 'bg-success'
         : status === 'EXPIRED'   ? 'bg-secondary'
         : 'bg-warning text-dark';
  }

  // ── Checklist (FEAT-M8) ──────────────────────────────────────────────────

  loadChecklist(): void {
    if (this.checklistLoaded) return;
    this.immigrationService.getChecklist(this.caseId).subscribe({
      next: items => {
        this.checklist = items;
        this.checklistLoaded = true;
        this.groupChecklist();
        this.loadChecklistVaultDocs();
      },
      error: err => { this.checklistError = err?.error?.error || 'Failed to load checklist'; }
    });
  }

  groupChecklist(): void {
    this.checklistByCategory = {};
    for (const item of this.checklist) {
      if (!this.checklistByCategory[item.category]) {
        this.checklistByCategory[item.category] = [];
      }
      this.checklistByCategory[item.category].push(item);
    }
  }

  get checklistCategories(): string[] {
    return Object.keys(this.checklistByCategory);
  }

  get allClearForPdf(): boolean {
    return this.checklist.length > 0 &&
      this.checklist.filter(i => i.required).every(i => i.status !== 'PENDING');
  }

  get pendingRequiredCount(): number {
    return this.checklist.filter(i => i.required && i.status === 'PENDING').length;
  }

  get verifiedChecklistCount(): number {
    return this.checklist.filter(i => i.status === 'VERIFIED').length;
  }

  categoryHandledCount(items: ChecklistItem[]): number {
    return items.filter(i => i.status === 'VERIFIED' || i.status === 'UPLOADED').length;
  }

  isFormTypeSelected(id: string): boolean {
    return this.generateFormTypes.includes(id);
  }

  toggleFormType(id: string): void {
    const idx = this.generateFormTypes.indexOf(id);
    if (idx >= 0) {
      this.generateFormTypes = this.generateFormTypes.filter(f => f !== id);
    } else {
      this.generateFormTypes = [...this.generateFormTypes, id];
    }
  }

  runGenerateChecklist(): void {
    if (!this.generateFormTypes.length) return;
    this.generatingChecklist = true;
    this.checklistError = null;
    this.immigrationService.generateChecklist(this.caseId, { formTypes: this.generateFormTypes }).subscribe({
      next: items => {
        this.checklist = items;
        this.checklistLoaded = true;
        this.showGeneratePanel = false;
        this.generatingChecklist = false;
        this.groupChecklist();
      },
      error: err => {
        this.checklistError = err?.error?.error || 'Failed to generate checklist';
        this.generatingChecklist = false;
      }
    });
  }

  toggleChecklistItem(itemId: number): void {
    this.expandedChecklistItem = this.expandedChecklistItem === itemId ? null : itemId;
  }

  doUpdateChecklistItem(itemId: number, req: UpdateChecklistItemRequest): void {
    this.updatingChecklistItem = itemId;
    this.immigrationService.updateChecklistItem(this.caseId, itemId, req).subscribe({
      next: updated => {
        const idx = this.checklist.findIndex(i => i.id === updated.id);
        if (idx >= 0) this.checklist[idx] = updated;
        this.groupChecklist();
        this.expandedChecklistItem = null;
        this.updatingChecklistItem = null;
      },
      error: err => {
        this.checklistError = err?.error?.error || 'Failed to update item';
        this.updatingChecklistItem = null;
      }
    });
  }

  markUploaded(item: ChecklistItem): void {
    const docId = this.docPickerSelection[item.id] ?? item.documentId ?? null;
    this.doUpdateChecklistItem(item.id, { status: 'UPLOADED', documentId: docId });
  }

  markVerified(item: ChecklistItem): void {
    this.doUpdateChecklistItem(item.id, { status: 'VERIFIED', documentId: item.documentId });
  }

  markWaived(item: ChecklistItem): void {
    const reason = this.waiverDraft[item.id] || '';
    if (!reason.trim()) { this.checklistError = 'Waiver reason is required'; return; }
    this.doUpdateChecklistItem(item.id, { status: 'WAIVED', waiverReason: reason });
  }

  revertToPending(item: ChecklistItem): void {
    this.doUpdateChecklistItem(item.id, { status: 'PENDING', documentId: null, waiverReason: null });
  }

  checklistStatusCss(status: string): string {
    return status === 'VERIFIED' ? 'bg-success'
         : status === 'UPLOADED' ? 'bg-info text-dark'
         : status === 'WAIVED'   ? 'bg-secondary'
         : 'bg-warning text-dark'; // PENDING
  }

  categoryCss(items: ChecklistItem[]): string {
    if (items.some(i => i.required && i.status === 'PENDING')) return 'text-danger';
    if (items.some(i => i.status === 'UPLOADED'))              return 'text-warning';
    return 'text-success';
  }

  categoryIcon(items: ChecklistItem[]): string {
    if (items.some(i => i.required && i.status === 'PENDING')) return 'bi-exclamation-circle-fill';
    if (items.some(i => i.status === 'UPLOADED'))              return 'bi-clock-fill';
    return 'bi-check-circle-fill';
  }

  loadChecklistVaultDocs(): void {
    if (this.checklistVaultDocsLoaded) return;
    this.http.get<{ content: { id: number; title: string }[] }>('/api/documents?size=200').subscribe({
      next: page => {
        this.checklistVaultDocs = (page.content || []).map(d => ({ id: d.id, title: d.title }));
        this.checklistVaultDocsLoaded = true;
      },
      error: () => { this.checklistVaultDocsLoaded = true; } // non-fatal
    });
  }

  // ── Priority date status (FEAT-M5) ────────────────────────────────────────

  private readonly EB_CASE_TYPES = new Set(['I140_EB2', 'I140_EB3', 'I485', 'PERM', 'GC_EAD', 'GC_RENEWAL']);

  isEbCaseType(caseType: string): boolean {
    return this.EB_CASE_TYPES.has(caseType);
  }

  get isEbCase(): boolean {
    return this.case ? this.isEbCaseType(this.case.caseType) : false;
  }

  loadPriorityDateStatus(): void {
    this.priorityDateLoading = true;
    this.immigrationService.getPriorityDateStatus(this.caseId).subscribe({
      next: s => { this.priorityDateStatus = s; this.priorityDateLoading = false; },
      error: () => { this.priorityDateLoading = false; }
    });
  }

  // ── Case report downloads (FEAT-M6) ──────────────────────────────────────

  downloadReport(): void {
    if (this.downloadingReport) return;
    this.downloadingReport = true;
    this.immigrationService.downloadCaseReport(this.caseId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `case-${this.caseId}-report.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingReport = false;
      },
      error: () => { this.downloadingReport = false; }
    });
  }

  downloadTimeline(): void {
    if (this.downloadingTimeline) return;
    this.downloadingTimeline = true;
    this.immigrationService.downloadTimelineExport(this.caseId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `case-${this.caseId}-timeline.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingTimeline = false;
      },
      error: () => { this.downloadingTimeline = false; }
    });
  }
}
