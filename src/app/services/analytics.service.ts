import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AnalyticsData } from '../models/receipt.model';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private base = `${environment.apiUrl}/analytics`;
  private readonly source = 'AnalyticsService';

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getAnalytics(from?: string, to?: string): Observable<AnalyticsData> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> getAnalytics() - dateRange=[${from} to ${to}]`);
    
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    
    return this.http.get<AnalyticsData>(this.base, { params }).pipe(
      tap(data => {
        this.logger.apiCall(this.source, 'GET', '/analytics', startTime);
        this.logger.info(this.source, 
          `<<< getAnalytics() - SUCCESS: totalSpending=${data.totalSpending}, ` +
          `earned=${data.totalCashbackEarned}, potential=${data.totalPotentialCashback}, ` +
          `receipts=${data.totalReceipts}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/analytics', error, startTime);
        throw error;
      })
    );
  }

  getCards(): Observable<Record<string, string>> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> getCards() - Fetching card list');
    
    return this.http.get<Record<string, string>>(`${this.base}/cards`).pipe(
      tap(cards => {
        this.logger.apiCall(this.source, 'GET', '/analytics/cards', startTime);
        this.logger.debug(this.source, `<<< getCards() - Retrieved ${Object.keys(cards).length} cards`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/analytics/cards', error, startTime);
        throw error;
      })
    );
  }
}
