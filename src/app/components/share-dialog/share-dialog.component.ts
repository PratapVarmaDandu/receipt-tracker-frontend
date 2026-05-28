import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ExpenseShareService } from '../../services/expense-share.service';
import { LoggerService } from '../../services/logger.service';
import { ExpenseShare } from '../../models/expense-share.model';
import { Receipt } from '../../models/receipt.model';

interface InviteeRow {
  email: string;
  amount: number | null;
}

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss']
})
export class ShareDialogComponent implements OnInit {
  @Input() receipt!: Receipt;
  @Output() closed = new EventEmitter<void>();
  @Output() sharesCreated = new EventEmitter<ExpenseShare[]>();

  private readonly source = 'ShareDialogComponent';

  step: 1 | 2 | 3 = 1;
  splitType: 'EQUAL' | 'CUSTOM' = 'EQUAL';
  emailInput = '';
  rows: InviteeRow[] = [];
  submitting = false;
  error: string | null = null;
  createdShares: ExpenseShare[] = [];

  constructor(
    private shareService: ExpenseShareService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {}

  get equalAmount(): number {
    if (!this.receipt?.total || this.rows.length === 0) return 0;
    return Math.round((this.receipt.total / (this.rows.length + 1)) * 100) / 100;
  }

  get equalPct(): number {
    if (this.rows.length === 0) return 0;
    return 100 / (this.rows.length + 1);
  }

  get customTotal(): number {
    return this.rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  }

  get customTotalOver(): boolean {
    return this.customTotal > (this.receipt?.total || 0) + 0.01;
  }

  parseEmails(): void {
    const parsed = this.emailInput
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));

    const unique = [...new Set(parsed)];
    this.rows = unique.map(email => ({ email, amount: null }));
    this.error = null;
  }

  goToStep2(): void {
    this.parseEmails();
    if (this.rows.length === 0) {
      this.error = 'Enter at least one valid email address.';
      return;
    }
    if (this.splitType === 'EQUAL') {
      this.submit();
    } else {
      this.step = 2;
    }
  }

  submit(): void {
    if (this.splitType === 'CUSTOM') {
      const missing = this.rows.some(r => !r.amount || r.amount <= 0);
      if (missing) { this.error = 'Enter an amount for every invitee.'; return; }
    }
    this.submitting = true;
    this.error = null;

    const payload = {
      splitType: this.splitType,
      invitees: this.rows.map(r => ({
        email: r.email,
        amount: this.splitType === 'CUSTOM' ? r.amount : null
      }))
    };

    this.shareService.createShares(this.receipt.id!, payload as any).subscribe({
      next: shares => {
        this.createdShares = shares;
        this.step = 3;
        this.submitting = false;
        this.sharesCreated.emit(shares);
        this.logger.info(this.source, `Shares created count=${shares.length}`);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to send invitations. Please try again.';
        this.submitting = false;
        this.logger.error(this.source, 'createShares failed', err);
      }
    });
  }

  shareLink(token: string): string {
    return `${window.location.origin}/share/${token}`;
  }

  copyLink(token: string): void {
    navigator.clipboard.writeText(this.shareLink(token)).catch(() => {});
  }

  close(): void {
    this.closed.emit();
  }
}
