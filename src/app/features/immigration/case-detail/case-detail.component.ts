import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import {
  ImmigrationService, ImmigrationCase, FormInstance, TimelineItem, KeyDate,
  ActivityFeedItem, ConsentRecord, ImmMessage,
  CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS,
  FORM_STATUS_LABELS, FORM_STATUS_CSS, EVENT_TYPE_ICONS, CHANNEL_LABELS
} from '../../../services/immigration.service';
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
  readonly channels = ['SHARED', 'ATTORNEY_BENEFICIARY', 'ATTORNEY_EMPLOYER'];

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immigrationService: ImmigrationService,
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
        if (c.callerRelationship === 'BENEFICIARY') {
          this.checkAndShowConsent();
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
    if (tab === 'messaging') this.loadMessages();
  }

  // ── Scope helpers (driven by callerRelationship from the DTO) ────────────

  canSeeForms(): boolean {
    return this.case?.callerRelationship === 'ATTORNEY';
  }

  visibleChannels(): string[] {
    const rel = this.case?.callerRelationship;
    if (rel === 'ATTORNEY') return ['SHARED', 'ATTORNEY_BENEFICIARY', 'ATTORNEY_EMPLOYER'];
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

  // ── Messaging ─────────────────────────────────────────────────────────────

  setMsgChannel(ch: string): void {
    this.msgChannel = ch;
    this.loadMessages();
  }

  loadMessages(): void {
    this.msgLoading = true;
    this.msgError = null;
    this.immigrationService.getMessages(this.caseId, this.msgChannel).subscribe({
      next: msgs => { this.messages = msgs; this.msgLoading = false; },
      error: err => {
        this.msgError = err?.error?.error || 'Failed to load messages';
        this.msgLoading = false;
        this.logger.error(this.source, 'loadMessages failed', err);
      }
    });
  }

  sendMessage(): void {
    if (!this.msgContent.trim()) return;
    this.sendingMsg = true;
    this.immigrationService.sendMessage(this.caseId, this.msgChannel, this.msgContent.trim()).subscribe({
      next: msg => { this.messages = [...this.messages, msg]; this.msgContent = ''; this.sendingMsg = false; },
      error: err => { this.sendingMsg = false; this.logger.error(this.source, 'sendMessage failed', err); }
    });
  }
}
