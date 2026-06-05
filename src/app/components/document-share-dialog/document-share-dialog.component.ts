import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DocumentService } from '../../services/document.service';
import { DocFile, DocumentShare } from '../../models/document.model';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-document-share-dialog',
  templateUrl: './document-share-dialog.component.html',
  styleUrls: ['./document-share-dialog.component.scss']
})
export class DocumentShareDialogComponent implements OnInit {
  /** Pre-selected document IDs (e.g. from document detail page). */
  @Input() preselectedDocIds: number[] = [];
  @Output() closed = new EventEmitter<DocumentShare | null>();

  private readonly source = 'DocumentShareDialogComponent';

  // Form state
  recipientEmail = '';
  recipientName  = '';
  purpose        = '';
  message        = '';
  expiryDays     = 7;

  submitting = false;
  error: string | null = null;
  done: DocumentShare | null = null;

  // Common purpose presets for quick selection
  readonly PURPOSE_PRESETS = [
    'Tax Filing',
    'H1B Petition',
    'H1B Extension',
    'Green Card Application',
    'I-485 Submission',
    'F1 / OPT Application',
    'Mortgage / Loan Application',
    'Background Check',
    'Employment Verification',
  ];

  constructor(
    private docService: DocumentService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {}

  selectPurpose(p: string): void { this.purpose = p; }

  submit(): void {
    if (!this.recipientEmail.includes('@')) {
      this.error = 'Enter a valid email address.'; return;
    }
    if (this.preselectedDocIds.length === 0) {
      this.error = 'No documents selected.'; return;
    }

    this.submitting = true;
    this.error = null;

    this.docService.createShare({
      documentIds:    this.preselectedDocIds,
      recipientEmail: this.recipientEmail.trim().toLowerCase(),
      recipientName:  this.recipientName.trim() || undefined,
      purpose:        this.purpose.trim() || undefined,
      message:        this.message.trim() || undefined,
      expiryDays:     this.expiryDays
    }).subscribe({
      next: share => {
        this.done = share;
        this.submitting = false;
        this.logger.info(this.source, `Share created id=${share.id}`);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to share. Please try again.';
        this.submitting = false;
        this.logger.error(this.source, 'createShare failed', err);
      }
    });
  }

  shareUrl(token: string): string {
    return `${window.location.origin}/documents/shared/${token}`;
  }

  copyLink(token: string): void {
    navigator.clipboard.writeText(this.shareUrl(token)).catch(() => {});
  }

  close(): void { this.closed.emit(this.done); }
}
