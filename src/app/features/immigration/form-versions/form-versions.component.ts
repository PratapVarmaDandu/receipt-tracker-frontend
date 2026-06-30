import { Component, OnInit } from '@angular/core';
import {
  ImmigrationService, FormVersion, FORM_VERSION_STATUS_CSS,
  MappingBuilder, MappingBuilderQuestion
} from '../../../services/immigration.service';

interface FormTypeGroup {
  formType: string;
  displayName: string;
  versions: FormVersion[];
  expanded: boolean;
}

@Component({
  selector: 'app-form-versions',
  templateUrl: './form-versions.component.html',
  styleUrls: ['./form-versions.component.scss']
})
export class FormVersionsComponent implements OnInit {

  groups: FormTypeGroup[] = [];
  loading = false;
  error = '';

  // Per-version state
  expandedVersionId: number | null = null;
  uploadingId: number | null = null;
  uploadError: Record<number, string> = {};
  approvingId: number | null = null;
  approveError: Record<number, string> = {};

  readonly statusCss = FORM_VERSION_STATUS_CSS;

  // Manual upload (bootstrap a form version when the scheduler hasn't created one)
  showCreatePanel = false;
  readonly formTypeOptions = ['I129', 'I140', 'I485', 'I765', 'I131', 'I539', 'I290B', 'I693', 'G28', 'PERM'];
  newFormType = 'I129';
  newEditionDate = '';
  newFile: File | null = null;
  newFileName = '';
  creating = false;
  createError = '';

  // Generate a static AcroForm template (data sheet) — no PDF design / mapping needed
  showTemplatePanel = false;
  tplFormType = 'I129';
  tplEditionDate = '';
  generatingTemplate = false;
  templateError = '';

  // Mapping builder (point-and-click question → PDF field pairing)
  builderVersionId: number | null = null;
  builder: MappingBuilder | null = null;
  builderPairs: Record<string, string> = {};
  // Precomputed once on load — never build this in the template (a new array per CD cycle
  // with ngModel selects inside causes a change-detection loop that freezes the page).
  builderSections: { section: string; sectionLabel: string; questions: MappingBuilderQuestion[] }[] = [];
  builderLoading = false;
  builderSaving = false;
  builderError = '';

  constructor(private immService: ImmigrationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.immService.getFormVersions().subscribe({
      next: grouped => {
        this.groups = Object.entries(grouped).map(([ft, versions]) => ({
          formType: ft,
          displayName: versions[0]?.formTypeDisplayName ?? ft,
          versions,
          expanded: false
        }));
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message ?? 'Failed to load form versions.';
        this.loading = false;
      }
    });
  }

  toggleGroup(g: FormTypeGroup): void {
    g.expanded = !g.expanded;
  }

  toggleVersion(id: number): void {
    this.expandedVersionId = this.expandedVersionId === id ? null : id;
  }

  isExpanded(id: number): boolean {
    return this.expandedVersionId === id;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_REVIEW: 'Pending Review',
      APPROVED: 'Approved',
      DEPRECATED: 'Deprecated'
    };
    return labels[status] ?? status;
  }

  pendingCount(g: FormTypeGroup): number {
    return g.versions.filter(v => v.status === 'PENDING_REVIEW').length;
  }

  approvedVersion(g: FormTypeGroup): FormVersion | null {
    return g.versions.find(v => v.status === 'APPROVED') ?? null;
  }

  onFileSelected(event: Event, versionId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingId = versionId;
    delete this.uploadError[versionId];
    this.immService.uploadFormVersionMapping(versionId, file).subscribe({
      next: updated => {
        this.replaceVersion(updated);
        this.uploadingId = null;
      },
      error: err => {
        this.uploadError[versionId] = err?.error?.message ?? 'Upload failed.';
        this.uploadingId = null;
        input.value = '';
      }
    });
  }

  doApprove(versionId: number): void {
    this.approvingId = versionId;
    delete this.approveError[versionId];
    this.immService.approveFormVersion(versionId).subscribe({
      next: updated => {
        this.replaceVersion(updated);
        // Also reload so deprecated versions update
        this.load();
        this.approvingId = null;
      },
      error: err => {
        this.approveError[versionId] = err?.error?.message ?? 'Approval failed.';
        this.approvingId = null;
      }
    });
  }

  onCreateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newFile = input.files?.length ? input.files[0] : null;
    this.newFileName = this.newFile?.name ?? '';
  }

  doCreate(): void {
    if (!this.newFormType || !this.newEditionDate.trim() || !this.newFile) {
      this.createError = 'Form type, edition date, and a PDF file are required.';
      return;
    }
    this.creating = true;
    this.createError = '';
    this.immService.createFormVersion(this.newFormType, this.newEditionDate.trim(), this.newFile).subscribe({
      next: () => {
        this.creating = false;
        this.showCreatePanel = false;
        this.newEditionDate = '';
        this.newFile = null;
        this.newFileName = '';
        this.load();
      },
      error: err => {
        this.createError = err?.error?.error ?? err?.error?.message ?? 'Upload failed.';
        this.creating = false;
      }
    });
  }

  doGenerateTemplate(): void {
    if (!this.tplFormType || !this.tplEditionDate.trim()) {
      this.templateError = 'Form type and edition date are required.';
      return;
    }
    this.generatingTemplate = true;
    this.templateError = '';
    this.immService.generateFormTemplate(this.tplFormType, this.tplEditionDate.trim()).subscribe({
      next: () => {
        this.generatingTemplate = false;
        this.showTemplatePanel = false;
        this.tplEditionDate = '';
        this.load();
      },
      error: err => {
        this.templateError = err?.error?.error ?? err?.error?.message ?? 'Template generation failed.';
        this.generatingTemplate = false;
      }
    });
  }

  // ── Mapping builder ────────────────────────────────────────────────────────

  toggleBuilder(version: FormVersion): void {
    if (this.builderVersionId === version.id) {
      this.closeBuilder();
      return;
    }
    this.builderVersionId = version.id;
    this.builder = null;
    this.builderSections = [];
    this.builderError = '';
    this.builderLoading = true;
    this.immService.getMappingBuilder(version.id).subscribe({
      next: b => {
        this.builder = b;
        this.builderPairs = { ...b.currentMapping };
        this.builderSections = this.groupQuestions(b.questions);
        this.builderMapped = this.countMapped();
        this.builderLoading = false;
      },
      error: err => {
        this.builderError = err?.error?.error ?? err?.error?.message ?? 'Failed to load mapping builder.';
        this.builderLoading = false;
      }
    });
  }

  closeBuilder(): void {
    this.builderVersionId = null;
    this.builder = null;
    this.builderSections = [];
  }

  private groupQuestions(questions: MappingBuilderQuestion[]):
      { section: string; sectionLabel: string; questions: MappingBuilderQuestion[] }[] {
    const groups: Record<string, { section: string; sectionLabel: string; questions: MappingBuilderQuestion[] }> = {};
    for (const q of questions) {
      const key = q.section || 'other';
      if (!groups[key]) groups[key] = { section: key, sectionLabel: q.sectionLabel || key, questions: [] };
      groups[key].questions.push(q);
    }
    return Object.values(groups);
  }

  // Recomputed only when a select changes (not every CD cycle)
  builderMapped = 0;
  onPairChange(): void {
    this.builderMapped = this.countMapped();
  }
  private countMapped(): number {
    return Object.values(this.builderPairs).filter(v => !!v && v.trim().length > 0).length;
  }

  trackSection = (_: number, s: { section: string }) => s.section;
  trackQuestion = (_: number, q: MappingBuilderQuestion) => q.key;

  saveBuilder(): void {
    if (this.builderVersionId == null) return;
    this.builderSaving = true;
    this.builderError = '';
    this.immService.saveFormVersionMapping(this.builderVersionId, this.builderPairs).subscribe({
      next: updated => {
        this.replaceVersion(updated);
        this.builderSaving = false;
        this.closeBuilder();
      },
      error: err => {
        this.builderError = err?.error?.error ?? err?.error?.message ?? 'Save failed.';
        this.builderSaving = false;
      }
    });
  }

  private replaceVersion(updated: FormVersion): void {
    for (const g of this.groups) {
      const idx = g.versions.findIndex(v => v.id === updated.id);
      if (idx >= 0) {
        g.versions[idx] = updated;
        break;
      }
    }
  }

  auditActionLabel(action: string): string {
    const labels: Record<string, string> = {
      DOWNLOADED:      'Downloaded',
      MANUAL_UPLOAD:   'Manual Upload',
      APPROVED:        'Approved',
      DEPRECATED:      'Deprecated',
      MAPPING_UPDATED: 'Mapping Verified',
      CHECK_NO_CHANGE: 'No Change',
      CHECK_ERROR:     'Check Error'
    };
    return labels[action] ?? action;
  }

  auditActionCss(action: string): string {
    const css: Record<string, string> = {
      DOWNLOADED:      'audit-info',
      MANUAL_UPLOAD:   'audit-info',
      APPROVED:        'audit-success',
      DEPRECATED:      'audit-muted',
      MAPPING_UPDATED: 'audit-success',
      CHECK_NO_CHANGE: 'audit-muted',
      CHECK_ERROR:     'audit-danger'
    };
    return css[action] ?? 'audit-muted';
  }
}
