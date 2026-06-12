import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { PlatformSquareConfig } from '../models/platform.model';

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
}
