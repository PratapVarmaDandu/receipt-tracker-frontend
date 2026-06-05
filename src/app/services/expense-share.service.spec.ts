import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ExpenseShareService } from './expense-share.service';
import { LoggerService } from './logger.service';
import { CreateShareRequest, ExpenseShare } from '../models/expense-share.model';
import { environment } from '../../environments/environment';

describe('ExpenseShareService', () => {
  let service: ExpenseShareService;
  let http: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  const api = environment.apiUrl;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService',
      ['trace', 'debug', 'info', 'error', 'apiCall', 'apiError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ExpenseShareService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(ExpenseShareService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ── createShares — EQUAL ─────────────────────────────────────────────────

  it('createShares EQUAL posts correct payload', () => {
    const req: CreateShareRequest = {
      splitType: 'EQUAL',
      invitees: [{ email: 'alice@x.com', amount: null }]
    };
    const mockResponse: ExpenseShare[] = [
      { id: 1, receiptId: 10, storeName: 'Test', inviteeEmail: 'alice@x.com',
        inviteeLinked: false, shareAmount: 5.00, counterAmount: null,
        shareNote: null, counterNote: null, changeResponseNote: null,
        status: 'PENDING', inviteToken: 'abc123', createdAt: '', updatedAt: '' }
    ];

    service.createShares(10, req).subscribe(shares => {
      expect(shares.length).toBe(1);
      expect(shares[0].inviteeEmail).toBe('alice@x.com');
    });

    const testReq = http.expectOne(`${api}/receipts/10/shares`);
    expect(testReq.request.method).toBe('POST');
    expect(testReq.request.body.splitType).toBe('EQUAL');
    testReq.flush(mockResponse);
  });

  // ── createShares — CUSTOM ────────────────────────────────────────────────

  it('createShares CUSTOM includes amounts', () => {
    const req: CreateShareRequest = {
      splitType: 'CUSTOM',
      invitees: [{ email: 'bob@x.com', amount: 3.50 }]
    };

    service.createShares(10, req).subscribe();

    const testReq = http.expectOne(`${api}/receipts/10/shares`);
    expect(testReq.request.body.invitees[0].amount).toBe(3.50);
    testReq.flush([]);
  });

  // ── createShares — ITEM_BASED ────────────────────────────────────────────

  it('createShares ITEM_BASED sends itemAssignments and no invitees', () => {
    const req: CreateShareRequest = {
      splitType: 'ITEM_BASED',
      itemAssignments: [
        { email: 'carol@x.com', itemIds: [101, 102] }
      ]
    };

    service.createShares(10, req).subscribe();

    const testReq = http.expectOne(`${api}/receipts/10/shares`);
    expect(testReq.request.body.splitType).toBe('ITEM_BASED');
    expect(testReq.request.body.itemAssignments[0].email).toBe('carol@x.com');
    expect(testReq.request.body.itemAssignments[0].itemIds).toEqual([101, 102]);
    testReq.flush([]);
  });

  it('createShares re-throws on error', (done) => {
    const req: CreateShareRequest = {
      splitType: 'EQUAL',
      invitees: [{ email: 'x@x.com', amount: null }]
    };

    service.createShares(10, req).subscribe({
      error: (err) => {
        expect(err.status).toBe(400);
        done();
      }
    });

    http.expectOne(`${api}/receipts/10/shares`).flush(
      { error: 'bad request' }, { status: 400, statusText: 'Bad Request' }
    );
  });

  // ── getSharesForReceipt ──────────────────────────────────────────────────

  it('getSharesForReceipt GETs the correct URL', () => {
    service.getSharesForReceipt(42).subscribe(shares => {
      expect(shares).toEqual([]);
    });
    const testReq = http.expectOne(`${api}/receipts/42/shares`);
    expect(testReq.request.method).toBe('GET');
    testReq.flush([]);
  });

  it('getSharesForReceipt returns empty array on error', () => {
    service.getSharesForReceipt(42).subscribe(shares => {
      expect(shares).toEqual([]);
    });
    http.expectOne(`${api}/receipts/42/shares`).flush(
      {}, { status: 403, statusText: 'Forbidden' }
    );
  });

  // ── getMyShares ──────────────────────────────────────────────────────────

  it('getMyShares GETs /shares/mine', () => {
    service.getMyShares().subscribe();
    const testReq = http.expectOne(`${api}/shares/mine`);
    expect(testReq.request.method).toBe('GET');
    testReq.flush([]);
  });

  // ── submitInviteeAction ──────────────────────────────────────────────────

  it('submitInviteeAction POSTs action payload', () => {
    service.submitInviteeAction('tok1', 'ACCEPT').subscribe();
    const testReq = http.expectOne(`${api}/shares/token/tok1/action`);
    expect(testReq.request.method).toBe('POST');
    expect(testReq.request.body.action).toBe('ACCEPT');
    testReq.flush({});
  });

  it('submitInviteeAction re-throws on error', (done) => {
    service.submitInviteeAction('badToken', 'ACCEPT').subscribe({
      error: (err) => { expect(err.status).toBe(403); done(); }
    });
    http.expectOne(`${api}/shares/token/badToken/action`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
  });
});
