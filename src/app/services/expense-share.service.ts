import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import {
  CreateShareRequest,
  ExpenseShare,
  ShareViewData
} from '../models/expense-share.model';

@Injectable({ providedIn: 'root' })
export class ExpenseShareService {
  private readonly source = 'ExpenseShareService';
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  createShares(receiptId: number, payload: CreateShareRequest): Observable<ExpenseShare[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> createShares(receiptId=${receiptId})`);
    return this.http.post<ExpenseShare[]>(`${this.api}/receipts/${receiptId}/shares`, payload).pipe(
      tap(shares => {
        this.logger.apiCall(this.source, 'POST', `/receipts/${receiptId}/shares`, startTime);
        this.logger.info(this.source, `<<< createShares created=${shares.length}`);
      }),
      catchError(err => {
        this.logger.apiError(this.source, 'POST', `/receipts/${receiptId}/shares`, err, startTime);
        throw err;
      })
    );
  }

  getSharesForReceipt(receiptId: number): Observable<ExpenseShare[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> getSharesForReceipt(${receiptId})`);
    return this.http.get<ExpenseShare[]>(`${this.api}/receipts/${receiptId}/shares`).pipe(
      tap(shares => {
        this.logger.apiCall(this.source, 'GET', `/receipts/${receiptId}/shares`, startTime);
        this.logger.debug(this.source, `<<< getSharesForReceipt count=${shares.length}`);
      }),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', `/receipts/${receiptId}/shares`, err, startTime);
        return of([]);
      })
    );
  }

  getShareByToken(token: string): Observable<ShareViewData | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> getShareByToken(${token})`);
    return this.http.get<ShareViewData>(`${this.api}/shares/token/${token}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/shares/token/${token}`, startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', `/shares/token/${token}`, err, startTime);
        return of(null);
      })
    );
  }

  submitInviteeAction(
    token: string,
    action: string,
    counterAmount?: number,
    counterNote?: string
  ): Observable<ExpenseShare | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> submitInviteeAction(${token}, ${action})`);
    const body = { action, counterAmount: counterAmount ?? null, counterNote: counterNote ?? null };
    return this.http.post<ExpenseShare>(`${this.api}/shares/token/${token}/action`, body).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/shares/token/${token}/action`, startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'POST', `/shares/token/${token}/action`, err, startTime);
        throw err;
      })
    );
  }

  submitOwnerAction(
    shareId: number,
    action: string,
    responseNote?: string
  ): Observable<ExpenseShare | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> submitOwnerAction(${shareId}, ${action})`);
    const body = { action, responseNote: responseNote ?? null };
    return this.http.put<ExpenseShare>(`${this.api}/shares/${shareId}/owner-action`, body).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/shares/${shareId}/owner-action`, startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'PUT', `/shares/${shareId}/owner-action`, err, startTime);
        return of(null);
      })
    );
  }

  getMyShares(): Observable<ExpenseShare[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> getMyShares()');
    return this.http.get<ExpenseShare[]>(`${this.api}/shares/mine`).pipe(
      tap(shares => {
        this.logger.apiCall(this.source, 'GET', '/shares/mine', startTime);
        this.logger.debug(this.source, `<<< getMyShares count=${shares.length}`);
      }),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/shares/mine', err, startTime);
        return of([]);
      })
    );
  }
}
