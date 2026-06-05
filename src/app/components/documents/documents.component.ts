import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import {
  DocFile, DocumentCategory, DocumentSummary, SubcategoryOption,
  CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS,
  SUBCATEGORIES, STATUS_LABELS, VISA_TYPE_LABELS
} from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { LoggerService } from '../../services/logger.service';

interface UploadForm {
  file: File | null;
  title: string;
  category: DocumentCategory;
  subcategory: string;
  documentYear: number | null;
  expiryDate: string;
  notes: string;
}

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  private readonly source = 'DocumentsComponent';

  // ── State ─────────────────────────────────────────────────────────────────
  summary: DocumentSummary | null = null;
  docs: DocFile[] = [];
  filtered: DocFile[] = [];
  loading = true;
  uploading = false;
  uploadError: string | null = null;

  // Filters
  activeCategory: DocumentCategory | '' = '';
  searchText = '';
  statusFilter: 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' = 'ALL';

  // Upload panel
  showUpload = false;
  dragover = false;
  uploadForm: UploadForm = this.emptyForm();

  // Metadata
  readonly categories: DocumentCategory[] = ['RESUME', 'TAX', 'INCOME', 'IMMIGRATION', 'OTHER'];
  readonly CATEGORY_LABELS = CATEGORY_LABELS;
  readonly CATEGORY_ICONS  = CATEGORY_ICONS;
  readonly CATEGORY_COLORS = CATEGORY_COLORS;
  readonly SUBCATEGORIES   = SUBCATEGORIES;
  readonly STATUS_LABELS   = STATUS_LABELS;
  readonly VISA_TYPE_LABELS = VISA_TYPE_LABELS;

  readonly currentYear = new Date().getFullYear();
  readonly years: number[] = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  constructor(
    private docService: DocumentService,
    private logger: LoggerService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.docService.getSummary().subscribe(s => this.summary = s);
    this.docService.list(this.activeCategory || undefined).subscribe({
      next: docs => {
        this.docs = docs;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setCategory(cat: DocumentCategory | ''): void {
    this.activeCategory = cat;
    this.load();
  }

  applyFilters(): void {
    let result = [...this.docs];
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.originalFileName || '').toLowerCase().includes(q) ||
        (d.subcategory || '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter !== 'ALL') {
      result = result.filter(d => d.status === this.statusFilter);
    }
    this.filtered = result;
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  onDragover(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Only trigger change detection once per drag entry, not on every mousemove event
    if (!this.dragover) {
      this.ngZone.run(() => { this.dragover = true; });
    }
  }

  onDragleave(event: DragEvent): void {
    event.preventDefault();
    this.dragover = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    this.uploadForm.file = file;
    if (!this.uploadForm.title) {
      this.uploadForm.title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }
    this.showUpload = true;
  }

  get subcategoryOptions() {
    return this.uploadForm.category ? SUBCATEGORIES[this.uploadForm.category] : [];
  }

  get subcategoryGroups(): { visaType: string; label: string; options: SubcategoryOption[] }[] {
    if (this.uploadForm.category !== 'IMMIGRATION') return [];
    const grouped: Record<string, typeof this.subcategoryOptions> = {};
    for (const opt of this.subcategoryOptions) {
      const vt = opt.visaType || 'GENERAL';
      if (!grouped[vt]) grouped[vt] = [];
      grouped[vt].push(opt);
    }
    return Object.entries(grouped).map(([k, v]) => ({
      visaType: k,
      label: VISA_TYPE_LABELS[k] || k,
      options: v
    }));
  }

  submitUpload(): void {
    if (!this.uploadForm.file || !this.uploadForm.category) {
      this.uploadError = 'Please select a file and category.';
      return;
    }
    this.uploading = true;
    this.uploadError = null;

    this.docService.upload(
      this.uploadForm.file,
      this.uploadForm.title,
      this.uploadForm.category,
      this.uploadForm.subcategory || undefined,
      this.uploadForm.documentYear || undefined,
      this.uploadForm.expiryDate || undefined,
      this.uploadForm.notes || undefined
    ).subscribe({
      next: doc => {
        this.uploading = false;
        this.showUpload = false;
        this.uploadForm = this.emptyForm();
        this.docs.unshift(doc);
        this.applyFilters();
        if (this.summary) this.summary.total++;
        this.logger.info(this.source, `Uploaded doc id=${doc.id}`);
      },
      error: err => {
        this.uploading = false;
        this.uploadError = err?.error?.error ?? 'Upload failed. Please try again.';
        this.logger.error(this.source, 'Upload failed', err);
      }
    });
  }

  emptyForm(): UploadForm {
    return { file: null, title: '', category: 'OTHER', subcategory: '', documentYear: null, expiryDate: '', notes: '' };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  openDoc(id: number): void {
    this.router.navigate(['/documents', id]);
  }

  fileSizeLabel(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  fileIcon(contentType: string | null): string {
    if (!contentType) return 'bi-file-earmark';
    if (contentType.includes('pdf'))   return 'bi-file-earmark-pdf';
    if (contentType.includes('image')) return 'bi-file-earmark-image';
    if (contentType.includes('word'))  return 'bi-file-earmark-word';
    if (contentType.includes('sheet') || contentType.includes('excel')) return 'bi-file-earmark-excel';
    return 'bi-file-earmark-text';
  }

  subcategoryLabel(sub: string): string {
    return sub.split('_').join(' ');
  }

  trackById(_: number, d: DocFile): number { return d.id; }
}
