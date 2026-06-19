import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import {
  ImmigrationService, ImmigrationCase, FormInstance, TimelineItem, KeyDate,
  ActivityFeedItem, ConsentRecord, ImmMessage, CanonicalProfile,
  CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS,
  FORM_STATUS_LABELS, FORM_STATUS_CSS, EVENT_TYPE_ICONS, CHANNEL_LABELS,
  StatusHistoryItem, AttorneyProfile, CASE_TYPE_GROUPS, FamilyBundle,
  H1bCapRegistration, CaseTask, CreateCaseTaskRequest
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
    private logger: LoggerService
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
        if (c.caseType === 'H1B_INITIAL') this.loadH1bCap();
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
    if (tab === 'forms'     && !this.formsLoaded)    this.loadForms();
    if (tab === 'timeline'  && !this.timelineLoaded) this.loadTimeline();
    if (tab === 'messaging') { this.loadMessages(); this.loadUnreadCounts(); }
    if (tab === 'profile')   this.loadBeneficiaryProfile();
    if (tab === 'tasks'     && !this.tasksLoaded)    this.loadTasks();
  }

  // ── Role helpers ──────────────────────────────────────────────────────────
  get isBeneficiary(): boolean { return this.case?.callerRelationship === 'BENEFICIARY'; }
  get isAttorney():    boolean { return this.case?.callerRelationship === 'ATTORNEY'; }
  get isEmployer():    boolean { return this.case?.callerRelationship === 'HR_ADMIN'; }
  get isOrgMember():   boolean { return this.isAttorney || this.isEmployer; }

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
}
