import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';

import { ShareDialogComponent } from './share-dialog.component';
import { ExpenseShareService } from '../../services/expense-share.service';
import { LoggerService } from '../../services/logger.service';
import { Receipt } from '../../models/receipt.model';
import { ExpenseShare } from '../../models/expense-share.model';

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 1,
    storeName: 'Test Store',
    storeType: 'GROCERY',
    purchaseDateTime: '2024-01-01T12:00:00',
    total: 10.00,
    subtotal: 9.50,
    tax: 0.50,
    items: [
      { id: 101, name: 'Milk', quantity: 1, unitPrice: 3.00, totalPrice: 3.00, taxable: false },
      { id: 102, name: 'Cheese', quantity: 1, unitPrice: 6.50, totalPrice: 6.50, taxable: true }
    ],
    ...overrides
  };
}

describe('ShareDialogComponent', () => {
  let component: ShareDialogComponent;
  let fixture: ComponentFixture<ShareDialogComponent>;
  let shareServiceSpy: jasmine.SpyObj<ExpenseShareService>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  beforeEach(async () => {
    shareServiceSpy = jasmine.createSpyObj('ExpenseShareService', ['createShares']);
    loggerSpy = jasmine.createSpyObj('LoggerService', ['trace', 'debug', 'info', 'error', 'apiCall', 'apiError']);

    await TestBed.configureTestingModule({
      declarations: [ShareDialogComponent],
      imports: [FormsModule, CommonModule],
      providers: [
        { provide: ExpenseShareService, useValue: shareServiceSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShareDialogComponent);
    component = fixture.componentInstance;
    component.receipt = makeReceipt();
    component.groupMembers = [];
    fixture.detectChanges();
  });

  // ── Mode toggle ──────────────────────────────────────────────────────────

  it('defaults to amount mode', () => {
    expect(component.mode).toBe('amount');
  });

  it('switchMode resets step and error', () => {
    component.error = 'old error';
    component.step = 2;
    component.switchMode('items');
    expect(component.mode).toBe('items');
    expect(component.step).toBe(1);
    expect(component.error).toBeNull();
  });

  // ── Amount mode ──────────────────────────────────────────────────────────

  it('parseEmails splits comma-separated input into rows', () => {
    component.emailInput = 'alice@x.com, bob@x.com';
    component.parseEmails();
    expect(component.rows.length).toBe(2);
    expect(component.rows[0].email).toBe('alice@x.com');
  });

  it('parseEmails deduplicates emails', () => {
    component.emailInput = 'alice@x.com, alice@x.com';
    component.parseEmails();
    expect(component.rows.length).toBe(1);
  });

  it('equalAmount divides total by invitees+1', () => {
    component.rows = [{ email: 'a@x.com', amount: null }];
    // 10.00 / 2 = 5.00
    expect(component.equalAmount).toBeCloseTo(5.00, 2);
  });

  it('goToStep2 shows error when no rows', () => {
    component.emailInput = '';
    component.rows = [];
    component.goToStep2();
    expect(component.error).toBeTruthy();
  });

  it('EQUAL split calls createShares and advances to step 3', () => {
    const fakeShare = { inviteeEmail: 'a@x.com', inviteToken: 'tok1' } as ExpenseShare;
    shareServiceSpy.createShares.and.returnValue(of([fakeShare]));

    component.splitType = 'EQUAL';
    component.rows = [{ email: 'a@x.com', amount: null }];
    component.submitAmount();

    expect(shareServiceSpy.createShares).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({ splitType: 'EQUAL' })
    );
    expect(component.step).toBe(3);
    expect(component.createdShares.length).toBe(1);
  });

  it('CUSTOM split rejects zero amounts', () => {
    component.splitType = 'CUSTOM';
    component.rows = [{ email: 'a@x.com', amount: 0 }];
    component.submitAmount();
    expect(component.error).toBeTruthy();
    expect(shareServiceSpy.createShares).not.toHaveBeenCalled();
  });

  it('shows error message when createShares fails', () => {
    shareServiceSpy.createShares.and.returnValue(throwError(() => ({ error: { error: 'Server error' } })));
    component.splitType = 'EQUAL';
    component.rows = [{ email: 'a@x.com', amount: null }];
    component.submitAmount();
    expect(component.error).toBe('Server error');
    expect(component.submitting).toBeFalse();
  });

  // ── Item mode ────────────────────────────────────────────────────────────

  it('addItemInvitee adds email to itemInvitees and creates empty assignment set', () => {
    (component as any).addItemInvitee('carol@x.com');
    expect(component.itemInvitees).toContain('carol@x.com');
    expect(component.itemAssignments.get('carol@x.com')?.size).toBe(0);
  });

  it('removeItemInvitee removes email from list and map', () => {
    (component as any).addItemInvitee('carol@x.com');
    component.removeItemInvitee('carol@x.com');
    expect(component.itemInvitees).not.toContain('carol@x.com');
    expect(component.itemAssignments.has('carol@x.com')).toBeFalse();
  });

  it('toggleItemAssignment adds then removes item', () => {
    (component as any).addItemInvitee('carol@x.com');
    component.toggleItemAssignment('carol@x.com', 101);
    expect(component.isItemAssigned('carol@x.com', 101)).toBeTrue();
    component.toggleItemAssignment('carol@x.com', 101);
    expect(component.isItemAssigned('carol@x.com', 101)).toBeFalse();
  });

  it('inviteeSubtotal sums assigned item prices', () => {
    (component as any).addItemInvitee('carol@x.com');
    component.toggleItemAssignment('carol@x.com', 101); // $3.00
    component.toggleItemAssignment('carol@x.com', 102); // $6.50
    expect(component.inviteeSubtotal('carol@x.com')).toBeCloseTo(9.50, 2);
  });

  it('inviteeTax adds tax only for taxable items', () => {
    // effectiveTaxRate = 0.50 / 9.50 ≈ 0.05263
    (component as any).addItemInvitee('carol@x.com');
    component.toggleItemAssignment('carol@x.com', 101); // non-taxable $3.00 → no tax
    component.toggleItemAssignment('carol@x.com', 102); // taxable $6.50 → ~$0.34 tax
    const tax = component.inviteeTax('carol@x.com');
    expect(tax).toBeGreaterThan(0);
    // Only taxable item ($6.50) attracts tax
    const expectedTax = 6.50 * (0.50 / 9.50);
    expect(tax).toBeCloseTo(expectedTax, 4);
  });

  it('itemAssignmentsValid is false when an invitee has no items', () => {
    (component as any).addItemInvitee('carol@x.com');
    expect(component.itemAssignmentsValid).toBeFalse();
  });

  it('itemAssignmentsValid is true when all invitees have items', () => {
    (component as any).addItemInvitee('carol@x.com');
    component.toggleItemAssignment('carol@x.com', 101);
    expect(component.itemAssignmentsValid).toBeTrue();
  });

  it('submitItems sends ITEM_BASED payload', () => {
    const fakeShare = { inviteeEmail: 'carol@x.com', inviteToken: 'tok2', shareAmount: 3.00 } as ExpenseShare;
    shareServiceSpy.createShares.and.returnValue(of([fakeShare]));

    (component as any).addItemInvitee('carol@x.com');
    component.toggleItemAssignment('carol@x.com', 101);
    component.submitItems();

    const callArg = shareServiceSpy.createShares.calls.mostRecent().args[1] as any;
    expect(callArg.splitType).toBe('ITEM_BASED');
    expect(callArg.itemAssignments[0].email).toBe('carol@x.com');
    expect(callArg.itemAssignments[0].itemIds).toContain(101);
    expect(component.itemStep).toBe(3);
  });

  it('submitItems rejects when an invitee has no items', () => {
    (component as any).addItemInvitee('carol@x.com');
    component.submitItems();
    expect(component.error).toBeTruthy();
    expect(shareServiceSpy.createShares).not.toHaveBeenCalled();
  });

  // ── Group pre-fill ───────────────────────────────────────────────────────

  it('prefillFromGroup adds group member emails to item invitees', () => {
    component.groupMembers = ['alice@x.com', 'bob@x.com'];
    component.prefillFromGroup();
    expect(component.itemInvitees).toContain('alice@x.com');
    expect(component.itemInvitees).toContain('bob@x.com');
  });

  it('prefillFromGroup does not duplicate existing invitees', () => {
    component.groupMembers = ['alice@x.com'];
    (component as any).addItemInvitee('alice@x.com');
    component.prefillFromGroup();
    expect(component.itemInvitees.filter(e => e === 'alice@x.com').length).toBe(1);
  });
});
