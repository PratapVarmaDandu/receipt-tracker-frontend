import { Component, OnInit } from '@angular/core';
import { ImmigrationService, FormVersion, FORM_VERSION_STATUS_CSS } from '../../../services/immigration.service';

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
