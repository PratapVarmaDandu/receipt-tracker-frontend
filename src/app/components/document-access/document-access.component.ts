import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DocumentShare, CATEGORY_LABELS, CATEGORY_ICONS } from '../../models/document.model';

@Component({
  selector: 'app-document-access',
  templateUrl: './document-access.component.html',
  styleUrls: ['./document-access.component.scss']
})
export class DocumentAccessComponent implements OnInit {
  share: DocumentShare | null = null;
  loading = true;
  error: string | null = null;
  token = '';

  readonly CATEGORY_LABELS = CATEGORY_LABELS;
  readonly CATEGORY_ICONS  = CATEGORY_ICONS;

  constructor(private route: ActivatedRoute, private docService: DocumentService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.docService.getByShareToken(this.token).subscribe({
      next: share => { this.share = share; this.loading = false; },
      error: err => {
        this.error = err?.error?.error ?? 'This link is invalid or has expired.';
        this.loading = false;
      }
    });
  }

  downloadUrl(documentId: number): string {
    return this.docService.downloadViaShareUrl(this.token, documentId);
  }

  fileIcon(ct: string | null): string {
    if (!ct) return 'bi-file-earmark';
    if (ct.includes('pdf'))   return 'bi-file-earmark-pdf';
    if (ct.includes('image')) return 'bi-file-earmark-image';
    if (ct.includes('word'))  return 'bi-file-earmark-word';
    if (ct.includes('sheet') || ct.includes('excel')) return 'bi-file-earmark-excel';
    return 'bi-file-earmark-text';
  }

  fileSizeLabel(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
