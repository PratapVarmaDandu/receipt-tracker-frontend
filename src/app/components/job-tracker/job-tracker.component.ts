import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  JobApplication, JobApplicationStatus, JobApplicationSummary,
  KANBAN_COLUMNS, STATUS_LABELS, STATUS_COLORS, STATUS_LIGHT_COLORS, STATUS_ICONS
} from '../../models/job-application.model';
import { JobApplicationService, CreateJobApplicationRequest } from '../../services/job-application.service';
import { DocumentService } from '../../services/document.service';
import { LoggerService } from '../../services/logger.service';
import { DocFile } from '../../models/document.model';

type SortField = 'companyName' | 'jobTitle' | 'status' | 'appliedDate' | 'followUpDate' | 'nextInterviewAt' | 'salaryRange';
type SortDir = 'asc' | 'desc';
type ViewMode = 'kanban' | 'table';

interface AddForm {
  companyName: string;
  jobTitle: string;
  status: JobApplicationStatus;
  appliedDate: string;
  location: string;
  salaryRange: string;
  jobUrl: string;
  resumeDocumentId: number | null;
  resumeVersion: string;
  hrName: string;
  hrEmail: string;
  followUpDate: string;
}

@Component({
  selector: 'app-job-tracker',
  templateUrl: './job-tracker.component.html',
  styleUrls: ['./job-tracker.component.scss']
})
export class JobTrackerComponent implements OnInit {
  private readonly source = 'JobTrackerComponent';

  // ── State ──────────────────────────────────────────────────────────────────
  summary: JobApplicationSummary | null = null;
  apps: JobApplication[] = [];
  loading = true;
  error: string | null = null;

  viewMode: ViewMode = 'kanban';

  // Filters (table view)
  searchText = '';
  statusFilter: JobApplicationStatus | '' = '';

  // Sorting (table view)
  sortField: SortField = 'appliedDate';
  sortDir: SortDir = 'desc';

  // Add panel
  showAddPanel = false;
  saving = false;
  saveError: string | null = null;
  addForm: AddForm = this.emptyForm();

  // Delete confirm
  deleteTarget: JobApplication | null = null;
  deleting = false;

  // Resume docs for picker
  resumeDocs: DocFile[] = [];

  // Metadata for templates
  readonly KANBAN_COLUMNS = KANBAN_COLUMNS;
  readonly STATUS_LABELS  = STATUS_LABELS;
  readonly STATUS_COLORS  = STATUS_COLORS;
  readonly STATUS_LIGHT_COLORS = STATUS_LIGHT_COLORS;
  readonly STATUS_ICONS   = STATUS_ICONS;
  readonly ALL_STATUSES: JobApplicationStatus[] = [
    'APPLIED', 'PHONE_SCREEN', 'TECHNICAL', 'ONSITE', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED'
  ];
  readonly TODAY = new Date().toISOString().split('T')[0];

  constructor(
    private jobService: JobApplicationService,
    private docService: DocumentService,
    private logger: LoggerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('jobTrackerView');
    if (saved === 'table' || saved === 'kanban') this.viewMode = saved;
    this.load();
    this.loadResumeDocs();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.jobService.getSummary().subscribe({ next: s => this.summary = s, error: () => {} });
    this.jobService.list().subscribe({
      next: apps => { this.apps = apps; this.loading = false; },
      error: err => { this.error = 'Failed to load applications.'; this.loading = false; }
    });
  }

  loadResumeDocs(): void {
    this.docService.list('RESUME').subscribe({ next: docs => this.resumeDocs = docs, error: () => {} });
  }

  // ── View toggle ────────────────────────────────────────────────────────────

  setView(mode: ViewMode): void {
    this.viewMode = mode;
    localStorage.setItem('jobTrackerView', mode);
  }

  // ── Kanban helpers ─────────────────────────────────────────────────────────

  columnApps(status: JobApplicationStatus): JobApplication[] {
    return this.apps.filter(a => a.status === status);
  }

  // ── Table helpers ──────────────────────────────────────────────────────────

  get filtered(): JobApplication[] {
    let result = [...this.apps];
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(a =>
        a.companyName.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter) {
      result = result.filter(a => a.status === this.statusFilter);
    }
    return result;
  }

  get sorted(): JobApplication[] {
    return [...this.filtered].sort((a, b) => {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const av = this.sortValue(a);
      const bv = this.sortValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }

  private sortValue(app: JobApplication): string | null {
    switch (this.sortField) {
      case 'companyName':    return app.companyName.toLowerCase();
      case 'jobTitle':       return app.jobTitle.toLowerCase();
      case 'status':         return app.status;
      case 'appliedDate':    return app.appliedDate;
      case 'followUpDate':   return app.followUpDate;
      case 'nextInterviewAt': return app.nextInterviewAt;
      case 'salaryRange':    return app.salaryRange;
      default:               return null;
    }
  }

  sort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = field === 'appliedDate' ? 'desc' : 'asc';
    }
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  openApp(id: number): void {
    this.router.navigate(['/jobs', id]);
  }

  // ── Add application ────────────────────────────────────────────────────────

  toggleAddPanel(): void {
    this.showAddPanel = !this.showAddPanel;
    if (this.showAddPanel) this.addForm = this.emptyForm();
    this.saveError = null;
  }

  submitAdd(): void {
    if (!this.addForm.companyName.trim() || !this.addForm.jobTitle.trim()) {
      this.saveError = 'Company name and job title are required.';
      return;
    }
    this.saving = true;
    this.saveError = null;

    const req: CreateJobApplicationRequest = {
      companyName:      this.addForm.companyName.trim(),
      jobTitle:         this.addForm.jobTitle.trim(),
      status:           this.addForm.status,
      appliedDate:      this.addForm.appliedDate || this.TODAY,
      location:         this.addForm.location || undefined,
      salaryRange:      this.addForm.salaryRange || undefined,
      jobUrl:           this.addForm.jobUrl || undefined,
      resumeDocumentId: this.addForm.resumeDocumentId,
      resumeVersion:    this.addForm.resumeVersion || undefined,
      hrName:           this.addForm.hrName || undefined,
      hrEmail:          this.addForm.hrEmail || undefined,
      followUpDate:     this.addForm.followUpDate || undefined
    };

    this.jobService.create(req).subscribe({
      next: app => {
        this.apps.unshift(app);
        if (this.summary) { this.summary.total++; this.summary.active++; this.summary.thisMonth++; }
        this.saving = false;
        this.showAddPanel = false;
        this.addForm = this.emptyForm();
        this.logger.info(this.source, `Created job app id=${app.id}`);
      },
      error: err => {
        this.saving = false;
        this.saveError = err?.error?.error ?? 'Failed to save. Please try again.';
        this.logger.error(this.source, 'Create failed', err);
      }
    });
  }

  onResumeDocChange(): void {
    if (this.addForm.resumeDocumentId) {
      const doc = this.resumeDocs.find(d => d.id === Number(this.addForm.resumeDocumentId));
      if (doc && !this.addForm.resumeVersion) {
        this.addForm.resumeVersion = doc.title;
      }
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(app: JobApplication, event: Event): void {
    event.stopPropagation();
    this.deleteTarget = app;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.jobService.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.apps = this.apps.filter(a => a.id !== this.deleteTarget!.id);
        if (this.summary) this.summary.total--;
        this.deleteTarget = null;
        this.deleting = false;
      },
      error: err => {
        this.deleting = false;
        this.logger.error(this.source, 'Delete failed', err);
      }
    });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  formatInterviewDate(dt: string | null): string {
    if (!dt) return '';
    const d = new Date(dt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatShortDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  trackById(_: number, a: JobApplication): number { return a.id; }

  private emptyForm(): AddForm {
    return {
      companyName: '', jobTitle: '', status: 'APPLIED',
      appliedDate: this.TODAY, location: '', salaryRange: '', jobUrl: '',
      resumeDocumentId: null, resumeVersion: '', hrName: '', hrEmail: '', followUpDate: ''
    };
  }
}
