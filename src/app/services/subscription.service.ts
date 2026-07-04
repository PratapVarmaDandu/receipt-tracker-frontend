import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { PlatformSquareConfig } from '../models/platform.model';

/** A user's locally-tracked Square subscription — status, renewal date, grace deadline. */
export interface MySubscription {
  id: number;
  planId: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED';
  currentPeriodEnd: string | null;
  gracePeriodEndsAt: string | null;
  cancelEffectiveDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly source = 'SubscriptionService';
  private readonly base = `${environment.apiUrl}/subscriptions`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  /** Returns public Square SDK config (applicationId, locationId, environment, planIds). No token. */
  getSquareConfig(): Observable<PlatformSquareConfig> {
    const t = Date.now();
    return this.http.get<PlatformSquareConfig>(`${this.base}/square-config`).pipe(
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/subscriptions/square-config', err, t);
        throw err;
      })
    );
  }

  purchase(sourceId: string, planId: string): Observable<{ success: boolean; feature: string }> {
    const t = Date.now();
    return this.http.post<{ success: boolean; feature: string }>(`${this.base}/square`, { sourceId, planId }).pipe(
      catchError(err => {
        this.logger.apiError(this.source, 'POST', '/subscriptions/square', err, t);
        throw err;
      })
    );
  }

  /** Current user's local subscription rows. Swallows errors to [] — used by the app-shell banner, must never break the shell. */
  getMine(): Observable<MySubscription[]> {
    const t = Date.now();
    return this.http.get<MySubscription[]>(`${this.base}/mine`).pipe(
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/subscriptions/mine', err, t);
        return of([]);
      })
    );
  }

  /** User-initiated cancellation — schedules cancellation at Square for the end of the current billing period. */
  cancel(id: number): Observable<MySubscription> {
    const t = Date.now();
    return this.http.post<MySubscription>(`${this.base}/${id}/cancel`, {}).pipe(
      catchError(err => {
        this.logger.apiError(this.source, 'POST', `/subscriptions/${id}/cancel`, err, t);
        throw err;
      })
    );
  }
}
