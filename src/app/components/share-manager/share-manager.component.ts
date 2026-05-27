import { Component, Input, OnInit } from '@angular/core';
import { ExpenseShareService } from '../../services/expense-share.service';
import { LoggerService } from '../../services/logger.service';
import { ExpenseShare } from '../../models/expense-share.model';

@Component({
  selector: 'app-share-manager',
  templateUrl: './share-manager.component.html',
  styleUrls: ['./share-manager.component.scss']
})
export class ShareManagerComponent implements OnInit {
  @Input() receiptId!: number;

  private readonly source = 'ShareManagerComponent';

  shares: ExpenseShare[] = [];
  loading = false;
  actionInProgress: number | null = null;

  constructor(
    private shareService: ExpenseShareService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.loadShares();
  }

  loadShares(): void {
    this.loading = true;
    this.shareService.getSharesForReceipt(this.receiptId).subscribe(shares => {
      this.shares = shares;
      this.loading = false;
    });
  }

  approve(share: ExpenseShare): void {
    this.actionInProgress = share.id;
    this.shareService.submitOwnerAction(share.id, 'APPROVE').subscribe(updated => {
      if (updated) {
        const idx = this.shares.findIndex(s => s.id === share.id);
        if (idx !== -1) this.shares[idx] = updated;
        this.logger.info(this.source, `Approved share ${share.id}`);
      }
      this.actionInProgress = null;
    });
  }

  reject(share: ExpenseShare, note: string): void {
    this.actionInProgress = share.id;
    this.shareService.submitOwnerAction(share.id, 'REJECT', note || undefined).subscribe(updated => {
      if (updated) {
        const idx = this.shares.findIndex(s => s.id === share.id);
        if (idx !== -1) this.shares[idx] = updated;
        this.logger.info(this.source, `Rejected share ${share.id}`);
      }
      this.actionInProgress = null;
    });
  }

  shareLink(token: string): string {
    return `${window.location.origin}/share/${token}`;
  }

  copyLink(token: string): void {
    navigator.clipboard.writeText(this.shareLink(token)).catch(() => {});
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      DENIED: 'Denied',
      CHANGE_REQUESTED: 'Change Requested',
      CHANGE_APPROVED: 'Change Approved',
      CHANGE_REJECTED: 'Change Rejected'
    };
    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'badge-pending',
      ACCEPTED: 'badge-accepted',
      DENIED: 'badge-denied',
      CHANGE_REQUESTED: 'badge-change-requested',
      CHANGE_APPROVED: 'badge-change-approved',
      CHANGE_REJECTED: 'badge-change-rejected'
    };
    return classes[status] ?? '';
  }
}
