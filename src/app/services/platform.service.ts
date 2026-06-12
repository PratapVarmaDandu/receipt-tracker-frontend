import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { Organization } from '../models/organization.model';
import { PlatformStats, PlatformUser, PlatformSquareConfig, PlatformSquareConfigRequest } from '../models/platform.model';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly source = 'PlatformService';
  private readonly base = `${environment.apiUrl}/platform`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  listAllOrgs(): Observable<Organization[]> {
    const t = Date.now();
    return this.http.get<Organization[]>(`${this.base}/orgs`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/platform/orgs', err, t); return of([]); })
    );
  }

  getStats(): Observable<PlatformStats | null> {
    const t = Date.now();
    return this.http.get<PlatformStats>(`${this.base}/stats`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/platform/stats', err, t); return of(null); })
    );
  }

  setOrgStatus(slug: string, status: 'ACTIVE' | 'SUSPENDED'): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/orgs/${slug}/status`, { status }).pipe(
      catchError(err => { this.logger.error(this.source, 'setOrgStatus failed', err); throw err; })
    );
  }

  setOrgPlan(slug: string, plan: 'FREE' | 'PRO'): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/orgs/${slug}/plan`, { plan }).pipe(
      catchError(err => { this.logger.error(this.source, 'setOrgPlan failed', err); throw err; })
    );
  }

  /** Returns the org's active feature list after the grant. */
  grantFeature(slug: string, feature: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/orgs/${slug}/features`, { feature }).pipe(
      catchError(err => { this.logger.error(this.source, 'grantFeature failed', err); throw err; })
    );
  }

  /** Returns the org's active feature list after the revoke. */
  revokeFeature(slug: string, feature: string): Observable<string[]> {
    return this.http.delete<string[]>(`${this.base}/orgs/${slug}/features/${feature}`).pipe(
      catchError(err => { this.logger.error(this.source, 'revokeFeature failed', err); throw err; })
    );
  }

  // ── User management ──────────────────────────────────────────────────────

  getUsers(): Observable<PlatformUser[]> {
    const t = Date.now();
    return this.http.get<PlatformUser[]>(`${this.base}/users`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/platform/users', err, t); return of([]); })
    );
  }

  grantUserFeature(userId: number, feature: string): Observable<{ features: string[] }> {
    return this.http.post<{ features: string[] }>(`${this.base}/users/${userId}/features`, { feature }).pipe(
      catchError(err => { this.logger.error(this.source, 'grantUserFeature failed', err); throw err; })
    );
  }

  revokeUserFeature(userId: number, feature: string): Observable<{ features: string[] }> {
    return this.http.delete<{ features: string[] }>(`${this.base}/users/${userId}/features/${feature}`).pipe(
      catchError(err => { this.logger.error(this.source, 'revokeUserFeature failed', err); throw err; })
    );
  }

  // ── Platform Square config ────────────────────────────────────────────────

  getPlatformSquareConfig(): Observable<PlatformSquareConfig> {
    const t = Date.now();
    return this.http.get<PlatformSquareConfig>(`${this.base}/square-config`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/platform/square-config', err, t); throw err; })
    );
  }

  savePlatformSquareConfig(req: PlatformSquareConfigRequest): Observable<PlatformSquareConfig> {
    return this.http.put<PlatformSquareConfig>(`${this.base}/square-config`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'savePlatformSquareConfig failed', err); throw err; })
    );
  }

  clearPlatformSquareConfig(): Observable<any> {
    return this.http.delete(`${this.base}/square-config`).pipe(
      catchError(err => { this.logger.error(this.source, 'clearPlatformSquareConfig failed', err); throw err; })
    );
  }

  testPlatformSquareConnection(): Observable<{ success: boolean; locationCount: number; message: string }> {
    return this.http.post<any>(`${this.base}/square-config/test`, {}).pipe(
      catchError(err => { this.logger.error(this.source, 'testPlatformSquareConnection failed', err); throw err; })
    );
  }
}
