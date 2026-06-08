import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ExpenseShareService } from '../../services/expense-share.service';
import { LoggerService } from '../../services/logger.service';
import { ExpenseShare, ItemAssignment } from '../../models/expense-share.model';
import { Receipt, ReceiptItem } from '../../models/receipt.model';

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
  /** Emails of group members to offer as quick pre-fill (optional). */
  @Input() groupMembers: string[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() sharesCreated = new EventEmitter<ExpenseShare[]>();

  private readonly source = 'ShareDialogComponent';

  // ── Mode ─────────────────────────────────────────────────────────────────
  /** 'amount' = EQUAL/CUSTOM; 'items' = ITEM_BASED; 'paid_for_me' = PAID_FOR_ME */
  mode: 'amount' | 'items' | 'paid_for_me' = 'amount';

  // ── Amount mode state ──────────────────────────────────────────────────
  step: 1 | 2 | 3 = 1;
  splitType: 'EQUAL' | 'CUSTOM' = 'EQUAL';
  emailInput = '';
  rows: InviteeRow[] = [];

  // ── Item-based mode state ──────────────────────────────────────────────
  /** email → set of assigned item ids */
  itemAssignments: Map<string, Set<number>> = new Map();
  /** ordered list of invitee emails for item mode */
  itemInvitees: string[] = [];
  itemEmailInput = '';
  itemStep: 1 | 2 | 3 = 1; // 1=emails, 2=assign items, 3=success

  // ── Paid-for-me mode state ─────────────────────────────────────────────
  paidForMeEmail = '';
  paidForMeAmount: number | null = null;
  paidForMeStep: 1 | 2 = 1;

  // ── Shared ────────────────────────────────────────────────────────────
  submitting = false;
  error: string | null = null;
  createdShares: ExpenseShare[] = [];

  constructor(
    private shareService: ExpenseShareService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {}

  // ── Amount mode computed ──────────────────────────────────────────────

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

  // ── Amount mode methods ───────────────────────────────────────────────

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
    if (this.rows.length === 0) { this.error = 'Enter at least one valid email address.'; return; }
    if (this.splitType === 'EQUAL') { this.submitAmount(); } else { this.step = 2; }
  }

  submitAmount(): void {
    if (this.splitType === 'CUSTOM') {
      if (this.rows.some(r => !r.amount || r.amount <= 0)) {
        this.error = 'Enter an amount for every invitee.'; return;
      }
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

  // ── Item mode methods ─────────────────────────────────────────────────

  prefillFromGroup(): void {
    const existing = new Set(this.itemInvitees);
    this.groupMembers
      .filter(e => !existing.has(e.toLowerCase()))
      .forEach(e => this.addItemInvitee(e.toLowerCase()));
    this.itemEmailInput = '';
  }

  parseItemEmails(): void {
    const parsed = this.itemEmailInput
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));
    const unique = [...new Set(parsed)];
    unique.forEach(e => this.addItemInvitee(e));
    this.itemEmailInput = '';
  }

  private addItemInvitee(email: string): void {
    if (!this.itemInvitees.includes(email)) {
      this.itemInvitees.push(email);
      this.itemAssignments.set(email, new Set());
    }
  }

  removeItemInvitee(email: string): void {
    this.itemInvitees = this.itemInvitees.filter(e => e !== email);
    this.itemAssignments.delete(email);
  }

  goToItemAssign(): void {
    if (this.itemInvitees.length === 0) {
      this.error = 'Add at least one invitee.'; return;
    }
    if (!this.receipt.items?.length) {
      this.error = 'This receipt has no items to assign.'; return;
    }
    this.error = null;
    this.itemStep = 2;
  }

  isItemAssigned(email: string, itemId: number): boolean {
    return this.itemAssignments.get(email)?.has(itemId) ?? false;
  }

  toggleItemAssignment(email: string, itemId: number): void {
    const set = this.itemAssignments.get(email);
    if (!set) return;
    if (set.has(itemId)) { set.delete(itemId); } else { set.add(itemId); }
  }

  /** Subtotal of items assigned to an invitee (before tax). */
  inviteeSubtotal(email: string): number {
    const ids = this.itemAssignments.get(email) ?? new Set<number>();
    return this.receipt.items
      .filter(i => i.id != null && ids.has(i.id))
      .reduce((s, i) => s + (i.totalPrice || 0), 0);
  }

  /** Tax amount for taxable items assigned to an invitee. */
  inviteeTax(email: string): number {
    const ids = this.itemAssignments.get(email) ?? new Set<number>();
    const rate = this.effectiveTaxRate;
    return this.receipt.items
      .filter(i => i.id != null && ids.has(i.id) && i.taxable)
      .reduce((s, i) => s + (i.totalPrice || 0) * rate, 0);
  }

  inviteeTotal(email: string): number {
    return this.inviteeSubtotal(email) + this.inviteeTax(email);
  }

  get effectiveTaxRate(): number {
    const sub = this.receipt.subtotal || 0;
    const tax = this.receipt.tax || 0;
    return sub > 0 ? tax / sub : 0;
  }

  get effectiveTaxPct(): number {
    return this.effectiveTaxRate * 100;
  }

  /** True if every invitee has at least one item. */
  get itemAssignmentsValid(): boolean {
    return this.itemInvitees.every(e => (this.itemAssignments.get(e)?.size ?? 0) > 0);
  }

  submitItems(): void {
    if (!this.itemAssignmentsValid) {
      this.error = 'Every invitee must have at least one item assigned.'; return;
    }
    this.submitting = true;
    this.error = null;

    const assignments: ItemAssignment[] = this.itemInvitees.map(email => ({
      email,
      itemIds: Array.from(this.itemAssignments.get(email) ?? [])
    }));

    const payload = { splitType: 'ITEM_BASED' as const, itemAssignments: assignments };

    this.shareService.createShares(this.receipt.id!, payload).subscribe({
      next: shares => {
        this.createdShares = shares;
        this.itemStep = 3;
        this.submitting = false;
        this.sharesCreated.emit(shares);
        this.logger.info(this.source, `Item-based shares created count=${shares.length}`);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to send invitations. Please try again.';
        this.submitting = false;
        this.logger.error(this.source, 'createItemShares failed', err);
      }
    });
  }

  // ── Paid-for-me methods ───────────────────────────────────────────────

  submitPaidForMe(): void {
    const email = this.paidForMeEmail.trim().toLowerCase();
    if (!email.includes('@')) { this.error = 'Enter a valid email address.'; return; }
    if (!this.paidForMeAmount || this.paidForMeAmount <= 0) { this.error = 'Enter the amount you owe.'; return; }

    this.submitting = true;
    this.error = null;

    const payload = {
      splitType: 'PAID_FOR_ME' as const,
      invitees: [{ email, amount: this.paidForMeAmount }]
    };

    this.shareService.createShares(this.receipt.id!, payload).subscribe({
      next: shares => {
        this.createdShares = shares;
        this.paidForMeStep = 2;
        this.submitting = false;
        this.sharesCreated.emit(shares);
        this.logger.info(this.source, `PAID_FOR_ME share created`);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to record the payment. Please try again.';
        this.submitting = false;
        this.logger.error(this.source, 'createPaidForMe failed', err);
      }
    });
  }

  // ── Mode switch ───────────────────────────────────────────────────────

  switchMode(m: 'amount' | 'items' | 'paid_for_me'): void {
    this.mode = m;
    this.error = null;
    this.step = 1;
    this.itemStep = 1;
    this.paidForMeStep = 1;
  }

  // ── Shared ────────────────────────────────────────────────────────────

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
