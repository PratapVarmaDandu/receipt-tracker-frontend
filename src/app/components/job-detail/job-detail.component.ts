import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  JobApplication, JobApplicationStatus, InterviewRound, InterviewFormat, InterviewOutcome,
  KANBAN_COLUMNS, STATUS_LABELS, STATUS_COLORS, STATUS_LIGHT_COLORS, STATUS_ICONS,
  FORMAT_LABELS, FORMAT_ICONS, OUTCOME_LABELS, OUTCOME_COLORS
} from '../../models/job-application.model';
import { JobApplicationService, CreateJobApplicationRequest, CreateInterviewRoundRequest } from '../../services/job-application.service';
import { DocumentService } from '../../services/document.service';
import { JobNavigationService } from '../../services/job-navigation.service';
import { LoggerService } from '../../services/logger.service';
import { DocFile } from '../../models/document.model';

interface RoundForm {
  roundName: string;
  scheduledAt: string;
  format: string;
  interviewerName: string;
  outcome: string;
  notes: string;
}

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss']
})
export class JobDetailComponent implements OnInit {
  private readonly source = 'JobDetailComponent';

  app: JobApplication | null = null;
  loading = true;
  saving = false;
  error: string | null = null;
  saveError: string | null = null;
  editMode = false;

  // Edit form mirrors all editable fields
  editForm: Partial<CreateJobApplicationRequest> = {};

  // Portal credentials visibility (view mode)
  showPortalPassword = false;

  // Prev/Next navigation within the last-viewed list (kanban board / filtered table)
  prevId: number | null = null;
  nextId: number | null = null;

  // Interview round form
  showRoundForm = false;
  editingRound: InterviewRound | null = null;
  roundForm: RoundForm = this.emptyRoundForm();
  roundSaving = false;
  roundError: string | null = null;
  deleteRoundTarget: InterviewRound | null = null;

  // Resume docs picker
  resumeDocs: DocFile[] = [];

  // Display metadata
  readonly KANBAN_COLUMNS  = KANBAN_COLUMNS;
  readonly STATUS_LABELS   = STATUS_LABELS;
  readonly STATUS_COLORS   = STATUS_COLORS;
  readonly STATUS_LIGHT_COLORS = STATUS_LIGHT_COLORS;
  readonly STATUS_ICONS    = STATUS_ICONS;
  readonly FORMAT_LABELS   = FORMAT_LABELS;
  readonly FORMAT_ICONS    = FORMAT_ICONS;
  readonly OUTCOME_LABELS  = OUTCOME_LABELS;
  readonly OUTCOME_COLORS  = OUTCOME_COLORS;

  readonly ALL_STATUSES: JobApplicationStatus[] = [
    'APPLIED', 'PHONE_SCREEN', 'TECHNICAL', 'ONSITE', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'
  ];
  readonly ALL_FORMATS: InterviewFormat[]  = ['PHONE', 'VIDEO', 'ONSITE', 'TAKE_HOME'];
  readonly ALL_OUTCOMES: InterviewOutcome[] = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobApplicationService,
    private docService: DocumentService,
    private jobNav: JobNavigationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.loadApp(id);
    });
    this.docService.list('RESUME').subscribe({ next: docs => this.resumeDocs = docs, error: () => {} });
  }

  private loadApp(id: number): void {
    this.loading = true;
    this.error = null;
    this.editMode = false;
    this.jobService.getById(id).subscribe({
      next: app => {
        this.app = app;
        this.loading = false;
        this.updateNavContext(id);
      },
      error: () => { this.error = 'Application not found.'; this.loading = false; }
    });
  }

  // ── Prev / Next navigation ─────────────────────────────────────────────────

  private updateNavContext(currentId: number): void {
    const ids = this.jobNav.getContext();
    if (ids.includes(currentId)) {
      this.setPrevNext(ids, currentId);
      return;
    }
    // No context (direct link / refresh) — fall back to the full list order.
    this.jobService.list().subscribe({
      next: apps => {
        const fallbackIds = apps.map(a => a.id);
        this.jobNav.setContext(fallbackIds);
        this.setPrevNext(fallbackIds, currentId);
      },
      error: () => { this.prevId = null; this.nextId = null; }
    });
  }

  private setPrevNext(ids: number[], currentId: number): void {
    const idx = ids.indexOf(currentId);
    this.prevId = idx > 0 ? ids[idx - 1] : null;
    this.nextId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
  }

  goToPrev(): void {
    if (this.prevId != null) this.router.navigate(['/jobs', this.prevId]);
  }

  goToNext(): void {
    if (this.nextId != null) this.router.navigate(['/jobs', this.nextId]);
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  startEdit(): void {
    if (!this.app) return;
    this.editForm = {
      companyName:      this.app.companyName,
      jobTitle:         this.app.jobTitle,
      status:           this.app.status,
      appliedDate:      this.app.appliedDate,
      followUpDate:     this.app.followUpDate || undefined,
      location:         this.app.location || undefined,
      salaryRange:      this.app.salaryRange || undefined,
      jobUrl:           this.app.jobUrl || undefined,
      hrName:           this.app.hrName || undefined,
      hrEmail:          this.app.hrEmail || undefined,
      hrPhone:          this.app.hrPhone || undefined,
      recruiterName:    this.app.recruiterName || undefined,
      recruiterEmail:   this.app.recruiterEmail || undefined,
      portalUsername:   this.app.portalUsername || undefined,
      portalPassword:   this.app.portalPassword || undefined,
      emailConfirmationReceived: this.app.emailConfirmationReceived,
      jobDescription:   this.app.jobDescription || undefined,
      prepNotes:        this.app.prepNotes || undefined,
      notes:            this.app.notes || undefined,
      resumeDocumentId: this.app.resumeDocumentId,
      resumeVersion:    this.app.resumeVersion || undefined
    };
    this.editMode = true;
    this.saveError = null;
  }

  cancelEdit(): void {
    this.editMode = false;
    this.saveError = null;
  }

  saveEdit(): void {
    if (!this.app) return;
    if (!this.editForm.companyName?.trim() || !this.editForm.jobTitle?.trim()) {
      this.saveError = 'Company name and job title are required.';
      return;
    }
    this.saving = true;
    this.saveError = null;

    this.jobService.update(this.app.id, this.editForm as CreateJobApplicationRequest).subscribe({
      next: updated => {
        this.app = updated;
        this.saving = false;
        this.editMode = false;
        this.logger.info(this.source, `Updated job app id=${this.app?.id}`);
      },
      error: err => {
        this.saving = false;
        this.saveError = err?.error?.error ?? 'Save failed.';
        this.logger.error(this.source, 'Update failed', err);
      }
    });
  }

  onResumeDocChange(): void {
    if (this.editForm.resumeDocumentId) {
      const doc = this.resumeDocs.find(d => d.id === Number(this.editForm.resumeDocumentId));
      if (doc && !this.editForm.resumeVersion) {
        this.editForm.resumeVersion = doc.title;
      }
    }
  }

  // ── Interview rounds ───────────────────────────────────────────────────────

  openRoundForm(existing?: InterviewRound): void {
    this.editingRound = existing || null;
    if (existing) {
      this.roundForm = {
        roundName:       existing.roundName,
        scheduledAt:     existing.scheduledAt ? this.toDateTimeLocal(existing.scheduledAt) : '',
        format:          existing.format || '',
        interviewerName: existing.interviewerName || '',
        outcome:         existing.outcome,
        notes:           existing.notes || ''
      };
    } else {
      this.roundForm = this.emptyRoundForm();
    }
    this.showRoundForm = true;
    this.roundError = null;
  }

  closeRoundForm(): void {
    this.showRoundForm = false;
    this.editingRound = null;
    this.roundError = null;
  }

  submitRound(): void {
    if (!this.app || !this.roundForm.roundName.trim()) {
      this.roundError = 'Round name is required.';
      return;
    }
    this.roundSaving = true;
    this.roundError = null;

    const req: CreateInterviewRoundRequest = {
      roundName:       this.roundForm.roundName.trim(),
      scheduledAt:     this.roundForm.scheduledAt ? new Date(this.roundForm.scheduledAt).toISOString() : null,
      format:          this.roundForm.format || undefined,
      interviewerName: this.roundForm.interviewerName || undefined,
      outcome:         this.roundForm.outcome || undefined,
      notes:           this.roundForm.notes || undefined
    };

    const obs = this.editingRound
      ? this.jobService.updateInterviewRound(this.app.id, this.editingRound.id, req)
      : this.jobService.addInterviewRound(this.app.id, req);

    obs.subscribe({
      next: _ => {
        this.roundSaving = false;
        this.showRoundForm = false;
        // Reload to get updated app state
        this.jobService.getById(this.app!.id).subscribe(a => this.app = a);
      },
      error: err => {
        this.roundSaving = false;
        this.roundError = err?.error?.error ?? 'Failed to save round.';
      }
    });
  }

  confirmDeleteRound(round: InterviewRound): void {
    this.deleteRoundTarget = round;
  }

  cancelDeleteRound(): void {
    this.deleteRoundTarget = null;
  }

  executeDeleteRound(): void {
    if (!this.app || !this.deleteRoundTarget) return;
    this.jobService.deleteInterviewRound(this.app.id, this.deleteRoundTarget.id).subscribe({
      next: () => {
        if (this.app) {
          this.app.interviewRounds = this.app.interviewRounds.filter(r => r.id !== this.deleteRoundTarget!.id);
        }
        this.deleteRoundTarget = null;
      },
      error: err => this.logger.error(this.source, 'Delete round failed', err)
    });
  }

  togglePortalPasswordVisibility(): void {
    this.showPortalPassword = !this.showPortalPassword;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/jobs']);
  }

  openJobUrl(): void {
    if (this.app?.jobUrl) window.open(this.app.jobUrl, '_blank', 'noopener');
  }

  openResume(): void {
    if (this.app?.resumeDocumentId) {
      this.router.navigate(['/documents', this.app.resumeDocumentId]);
    }
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(dt: string | null): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  formatInterviewDate(dt: string | null): string {
    if (!dt) return '';
    const d = new Date(dt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isPassed(step: JobApplicationStatus, current: JobApplicationStatus): boolean {
    const order = this.KANBAN_COLUMNS;
    return order.indexOf(step) < order.indexOf(current);
  }

  private toDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private emptyRoundForm(): RoundForm {
    return { roundName: '', scheduledAt: '', format: 'VIDEO', interviewerName: '', outcome: 'PENDING', notes: '' };
  }
}
