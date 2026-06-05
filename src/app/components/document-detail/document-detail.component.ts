import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DocFile, DocumentNextStep, CATEGORY_LABELS, CATEGORY_ICONS,
  CATEGORY_COLORS, SUBCATEGORIES, VISA_TYPE_LABELS
} from '../../models/document.model';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-document-detail',
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.scss']
})
export class DocumentDetailComponent implements OnInit {
  doc: DocFile | null = null;
  loading = true;
  saving = false;
  error = '';
  editing = false;

  // Edit form values
  editTitle = '';
  editSubcategory = '';
  editDocumentYear: number | null = null;
  editExpiryDate = '';
  editNotes = '';

  // Share
  showShareDialog = false;

  // Next step form
  showStepForm = false;
  newStepTitle = '';
  newStepDescription = '';
  newStepDueDate = '';
  stepError = '';
  addingStep = false;

  readonly CATEGORY_LABELS  = CATEGORY_LABELS;
  readonly CATEGORY_ICONS   = CATEGORY_ICONS;
  readonly CATEGORY_COLORS  = CATEGORY_COLORS;
  readonly SUBCATEGORIES    = SUBCATEGORIES;
  readonly VISA_TYPE_LABELS = VISA_TYPE_LABELS;

  currentYear = new Date().getFullYear();
  years = Array.from({ length: 10 }, (_, i) => this.currentYear - i);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docService: DocumentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.docService.getById(id).subscribe({
      next: d => { this.doc = d; this.seedEditForm(d); this.loading = false; },
      error: () => { this.loading = false; this.error = 'Document not found.'; }
    });
  }

  private seedEditForm(d: DocFile): void {
    this.editTitle        = d.title;
    this.editSubcategory  = d.subcategory ?? '';
    this.editDocumentYear = d.documentYear ?? null;
    this.editExpiryDate   = d.expiryDate ?? '';
    this.editNotes        = d.notes ?? '';
  }

  save(): void {
    if (!this.doc) return;
    this.saving = true;
    this.docService.update(this.doc.id, {
      title: this.editTitle,
      subcategory: this.editSubcategory || undefined,
      documentYear: this.editDocumentYear || undefined,
      expiryDate: this.editExpiryDate || undefined,
      notes: this.editNotes || undefined
    }).subscribe({
      next: d => { this.doc = d; this.saving = false; this.editing = false; },
      error: () => { this.saving = false; this.error = 'Save failed.'; }
    });
  }

  archive(): void {
    if (!this.doc || !confirm('Archive this document? It will be hidden from the main list.')) return;
    this.docService.archive(this.doc.id).subscribe({
      next: () => this.router.navigate(['/documents']),
      error: () => { this.error = 'Archive failed.'; }
    });
  }

  delete(): void {
    if (!this.doc || !confirm('Permanently delete this document and its file?')) return;
    this.docService.delete(this.doc.id).subscribe({
      next: () => this.router.navigate(['/documents']),
      error: () => { this.error = 'Delete failed.'; }
    });
  }

  get downloadUrl(): string {
    return this.doc ? this.docService.downloadUrl(this.doc.id) : '';
  }

  // ── Next steps ─────────────────────────────────────────────────────────────

  addStep(): void {
    if (!this.newStepTitle.trim() || !this.doc) {
      this.stepError = 'Enter a title for the action item.'; return;
    }
    this.addingStep = true;
    this.stepError = '';
    this.docService.addNextStep(
      this.doc.id,
      this.newStepTitle,
      this.newStepDescription || undefined,
      this.newStepDueDate || undefined
    ).subscribe({
      next: step => {
        this.doc!.nextSteps.push(step);
        this.newStepTitle = '';
        this.newStepDescription = '';
        this.newStepDueDate = '';
        this.showStepForm = false;
        this.addingStep = false;
      },
      error: () => { this.stepError = 'Failed to add step.'; this.addingStep = false; }
    });
  }

  completeStep(step: DocumentNextStep): void {
    this.docService.completeNextStep(step.id).subscribe({
      next: updated => {
        const idx = this.doc!.nextSteps.findIndex(s => s.id === step.id);
        if (idx >= 0) this.doc!.nextSteps[idx] = updated;
      }
    });
  }

  deleteStep(step: DocumentNextStep): void {
    this.docService.deleteNextStep(step.id).subscribe({
      next: () => { this.doc!.nextSteps = this.doc!.nextSteps.filter(s => s.id !== step.id); }
    });
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  get pendingSteps(): DocumentNextStep[] {
    return this.doc?.nextSteps.filter(s => !s.completed) ?? [];
  }

  get completedSteps(): DocumentNextStep[] {
    return this.doc?.nextSteps.filter(s => s.completed) ?? [];
  }

  get subcategoryOptions() {
    if (!this.doc) return [];
    return SUBCATEGORIES[this.doc.category] || [];
  }

  get subcategoryGroups() {
    if (this.doc?.category !== 'IMMIGRATION') return [];
    const grouped: Record<string, typeof this.subcategoryOptions> = {};
    for (const opt of this.subcategoryOptions) {
      const vt = opt.visaType || 'GENERAL';
      if (!grouped[vt]) grouped[vt] = [];
      grouped[vt].push(opt);
    }
    return Object.entries(grouped).map(([k, v]) => ({
      visaType: k, label: VISA_TYPE_LABELS[k] || k, options: v
    }));
  }

  urgencyClass(s: DocumentNextStep): string {
    if (s.completed) return 'step-done';
    if (s.urgency === 'OVERDUE') return 'step-overdue';
    if (s.urgency === 'DUE_SOON') return 'step-due-soon';
    return '';
  }

  formatSubcat(s: string | null): string {
    if (!s) return '';
    return s.split('_').join(' ');
  }

  retentionYear(doc: DocFile): number {
    const base = doc.documentYear ?? new Date(doc.uploadedAt).getFullYear();
    return base + 7;
  }

  fileIcon(ct: string | null): string {
    if (!ct) return 'bi-file-earmark';
    if (ct.includes('pdf'))   return 'bi-file-earmark-pdf';
    if (ct.includes('image')) return 'bi-file-earmark-image';
    if (ct.includes('word'))  return 'bi-file-earmark-word';
    if (ct.includes('sheet') || ct.includes('excel')) return 'bi-file-earmark-excel';
    return 'bi-file-earmark-text';
  }
}
