import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { ReceiptService } from '../../services/receipt.service';
import { LoggerService } from '../../services/logger.service';
import { Group } from '../../models/group.model';
import { Receipt } from '../../models/receipt.model';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss']
})
export class GroupDetailComponent implements OnInit {
  private readonly source = 'GroupDetailComponent';

  group: Group | null = null;
  loading = true;
  notFound = false;
  qrDataUrl = '';

  receipts: any[] = [];
  receiptsLoading = false;

  showAddReceipt = false;
  allReceipts: Receipt[] = [];
  allReceiptsLoading = false;
  selectedReceiptId: number | null = null;
  addingReceipt = false;
  addReceiptError: string | null = null;

  deleting = false;
  deleteError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupService: GroupService,
    private receiptService: ReceiptService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.groupService.getGroup(id).subscribe(group => {
      if (!group) { this.notFound = true; }
      else {
        this.group = group;
        this.generateQr();
        this.loadReceipts(id);
      }
      this.loading = false;
    });
  }

  private loadReceipts(groupId: number): void {
    this.receiptsLoading = true;
    this.groupService.getGroupReceipts(groupId).subscribe(rs => {
      this.receipts = rs;
      this.receiptsLoading = false;
    });
  }

  openAddReceipt(): void {
    this.showAddReceipt = true;
    this.selectedReceiptId = null;
    this.addReceiptError = null;
    if (this.allReceipts.length === 0) {
      this.allReceiptsLoading = true;
      this.receiptService.getAll().subscribe(rs => {
        this.allReceipts = rs;
        this.allReceiptsLoading = false;
      });
    }
  }

  get unassignedReceipts(): Receipt[] {
    const alreadyIn = new Set(this.receipts.map((r: any) => r.id));
    return this.allReceipts.filter(r => !alreadyIn.has(r.id));
  }

  addReceiptToGroup(): void {
    if (!this.selectedReceiptId || !this.group) return;
    this.addingReceipt = true;
    this.addReceiptError = null;
    this.receiptService.addToGroup(this.selectedReceiptId, this.group.id).subscribe({
      next: () => {
        this.showAddReceipt = false;
        this.selectedReceiptId = null;
        this.loadReceipts(this.group!.id);
        this.logger.info(this.source, `Added receipt ${this.selectedReceiptId} to group ${this.group!.id}`);
        this.addingReceipt = false;
      },
      error: err => {
        this.addReceiptError = err?.error?.error ?? 'Failed to add receipt.';
        this.addingReceipt = false;
        this.logger.error(this.source, 'addReceiptToGroup failed', err);
      }
    });
  }

  confirmDelete(): void {
    if (!this.group) return;
    if (!confirm(`Delete group "${this.group.name}"? All receipts will be unassigned and this cannot be undone.`)) return;
    this.deleting = true;
    this.deleteError = null;
    this.groupService.deleteGroup(this.group.id).subscribe({
      next: () => this.router.navigate(['/groups']),
      error: err => {
        this.deleteError = err?.error?.error ?? 'Failed to delete group.';
        this.deleting = false;
        this.logger.error(this.source, 'deleteGroup failed', err);
      }
    });
  }

  get joinUrl(): string {
    return `${window.location.origin}/group/join/${this.group?.inviteToken}`;
  }

  private generateQr(): void {
    QRCode.toDataURL(this.joinUrl, { width: 200, margin: 1 })
      .then(url => { this.qrDataUrl = url; })
      .catch(err => this.logger.error(this.source, 'QR generation failed', err));
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.joinUrl).catch(() => {});
  }

  shareViaWhatsApp(): void {
    const text = encodeURIComponent(`Join my expense group "${this.group?.name}": ${this.joinUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  shareViaEmail(): void {
    const subject = encodeURIComponent(`Join my expense group: ${this.group?.name}`);
    const body = encodeURIComponent(`Hi,\n\nI'd like you to join my expense group "${this.group?.name}".\n\nClick here to join: ${this.joinUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  shareViaTelegram(): void {
    const text = encodeURIComponent(`Join my expense group "${this.group?.name}": ${this.joinUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(this.joinUrl)}&text=${text}`, '_blank');
  }

  shareNative(): void {
    if (navigator.share) {
      navigator.share({ title: `Join ${this.group?.name}`, text: `Join my expense group`, url: this.joinUrl });
    }
  }

  get hasNativeShare(): boolean {
    return !!navigator.share;
  }
}
