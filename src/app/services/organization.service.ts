import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import {
  CreateOrganizationRequest, InviteMemberRequest, OrgMember, OrgOrder,
  OrgSquareConfig, OrgSquareConfigRequest,
  OrgCloverConfig, OrgCloverConfigRequest,
  Organization
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly source = 'OrganizationService';
  private readonly base = `${environment.apiUrl}/organizations`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  // ── Org CRUD ──────────────────────────────────────────────────────────────

  create(req: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>(this.base, req).pipe(
      catchError(err => { this.logger.error(this.source, 'create failed', err); throw err; })
    );
  }

  listMine(): Observable<Organization[]> {
    const t = Date.now();
    return this.http.get<Organization[]>(this.base).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/organizations', err, t); return of([]); })
    );
  }

  getBySlug(slug: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.base}/${slug}`).pipe(
      catchError(err => { this.logger.error(this.source, 'getBySlug failed', err); throw err; })
    );
  }

  update(slug: string, req: CreateOrganizationRequest): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/${slug}`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'update failed', err); throw err; })
    );
  }

  deleteOrg(slug: string): Observable<any> {
    return this.http.delete(`${this.base}/${slug}`).pipe(
      catchError(err => { this.logger.error(this.source, 'deleteOrg failed', err); throw err; })
    );
  }

  setPublicStore(slug: string, enabled: boolean): Observable<Organization> {
    return this.http.put<Organization>(`${this.base}/${slug}/public-store`, { enabled }).pipe(
      catchError(err => { this.logger.error(this.source, 'setPublicStore failed', err); throw err; })
    );
  }

  // ── Members ───────────────────────────────────────────────────────────────

  listMembers(slug: string): Observable<OrgMember[]> {
    const t = Date.now();
    return this.http.get<OrgMember[]>(`${this.base}/${slug}/members`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', `/${slug}/members`, err, t); return of([]); })
    );
  }

  invite(slug: string, req: InviteMemberRequest): Observable<OrgMember> {
    return this.http.post<OrgMember>(`${this.base}/${slug}/members`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'invite failed', err); throw err; })
    );
  }

  revoke(slug: string, memberId: number): Observable<any> {
    return this.http.delete(`${this.base}/${slug}/members/${memberId}`).pipe(
      catchError(err => { this.logger.error(this.source, 'revoke failed', err); throw err; })
    );
  }

  // ── Invite token flow ─────────────────────────────────────────────────────

  getInviteByToken(token: string): Observable<OrgMember> {
    return this.http.get<OrgMember>(`${environment.apiUrl}/org/join/${token}`).pipe(
      catchError(err => { this.logger.error(this.source, 'getInvite failed', err); throw err; })
    );
  }

  acceptInvite(token: string): Observable<OrgMember> {
    return this.http.post<OrgMember>(`${environment.apiUrl}/org/join/${token}`, {}).pipe(
      catchError(err => { this.logger.error(this.source, 'acceptInvite failed', err); throw err; })
    );
  }

  // ── Square config ─────────────────────────────────────────────────────────

  getSquareConfig(slug: string): Observable<OrgSquareConfig> {
    return this.http.get<OrgSquareConfig>(`${this.base}/${slug}/square`).pipe(
      catchError(err => { this.logger.error(this.source, 'getSquareConfig failed', err); throw err; })
    );
  }

  saveSquareConfig(slug: string, req: OrgSquareConfigRequest): Observable<OrgSquareConfig> {
    return this.http.put<OrgSquareConfig>(`${this.base}/${slug}/square`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'saveSquareConfig failed', err); throw err; })
    );
  }

  clearSquareConfig(slug: string): Observable<any> {
    return this.http.delete(`${this.base}/${slug}/square`).pipe(
      catchError(err => { this.logger.error(this.source, 'clearSquareConfig failed', err); throw err; })
    );
  }

  testSquareConnection(slug: string): Observable<{ success: boolean; locationCount?: number; message?: string; error?: string }> {
    return this.http.post<any>(`${this.base}/${slug}/square/test`, {}).pipe(
      catchError(err => { this.logger.error(this.source, 'testSquareConnection failed', err); throw err; })
    );
  }

  // ── Clover config ─────────────────────────────────────────────────────────

  getCloverConfig(slug: string): Observable<OrgCloverConfig> {
    return this.http.get<OrgCloverConfig>(`${this.base}/${slug}/clover`).pipe(
      catchError(err => { this.logger.error(this.source, 'getCloverConfig failed', err); throw err; })
    );
  }

  saveCloverConfig(slug: string, req: OrgCloverConfigRequest): Observable<OrgCloverConfig> {
    return this.http.put<OrgCloverConfig>(`${this.base}/${slug}/clover`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'saveCloverConfig failed', err); throw err; })
    );
  }

  clearCloverConfig(slug: string): Observable<any> {
    return this.http.delete(`${this.base}/${slug}/clover`).pipe(
      catchError(err => { this.logger.error(this.source, 'clearCloverConfig failed', err); throw err; })
    );
  }

  testCloverConnection(slug: string): Observable<{ success: boolean; locationCount?: number; message?: string; error?: string }> {
    return this.http.post<any>(`${this.base}/${slug}/clover/test`, {}).pipe(
      catchError(err => { this.logger.error(this.source, 'testCloverConnection failed', err); throw err; })
    );
  }

  // ── Org catalog / locations (org-scoped Clover) ───────────────────────────

  getOrgCloverCatalog(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${slug}/clover/catalog`).pipe(
      catchError(err => { this.logger.error(this.source, 'getOrgCloverCatalog failed', err); throw err; })
    );
  }

  getOrgCloverLocations(slug: string): Observable<any[]> {
    const t = Date.now();
    return this.http.get<any[]>(`${this.base}/${slug}/clover/locations`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', `/${slug}/clover/locations`, err, t); return of([]); })
    );
  }

  // ── Org catalog / locations (org-scoped Square) ───────────────────────────

  getOrgCatalog(slug: string): Observable<any[]> {
    const t = Date.now();
    return this.http.get<any[]>(`${this.base}/${slug}/catalog`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', `/${slug}/catalog`, err, t); return of([]); })
    );
  }

  getOrgLocations(slug: string): Observable<any[]> {
    const t = Date.now();
    return this.http.get<any[]>(`${this.base}/${slug}/locations`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', `/${slug}/locations`, err, t); return of([]); })
    );
  }

  createOrgPayment(slug: string, req: any): Observable<any> {
    return this.http.post<any>(`${this.base}/${slug}/payments`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'createOrgPayment failed', err); throw err; })
    );
  }

  /** Clover pay-at-store: registers the order with Clover, no card charge. */
  createOrgCloverOrder(slug: string, req: any): Observable<any> {
    return this.http.post<any>(`${this.base}/${slug}/clover/orders`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'createOrgCloverOrder failed', err); throw err; })
    );
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  getOrgOrders(slug: string): Observable<OrgOrder[]> {
    const t = Date.now();
    return this.http.get<OrgOrder[]>(`${this.base}/${slug}/orders`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', `/${slug}/orders`, err, t); return of([]); })
    );
  }

  // ── Public shop (no membership required) ─────────────────────────────────

  getPublicStores(): Observable<{ slug: string; name: string; squareConfigured: boolean; cloverConfigured: boolean }[]> {
    const t = Date.now();
    return this.http.get<any[]>(`${environment.apiUrl}/shop/public`).pipe(
      catchError(err => { this.logger.apiError(this.source, 'GET', '/shop/public', err, t); return of([]); })
    );
  }

  getPublicSquareConfig(slug: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/shop/public/${slug}/square/config`).pipe(
      catchError(err => { this.logger.error(this.source, 'getPublicSquareConfig failed', err); throw err; })
    );
  }

  getPublicOrgLocations(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/shop/public/${slug}/square/locations`).pipe(
      catchError(() => of([]))
    );
  }

  getPublicOrgCloverLocations(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/shop/public/${slug}/clover/locations`).pipe(
      catchError(() => of([]))
    );
  }

  getPublicOrgCatalog(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/shop/public/${slug}/square/catalog`).pipe(
      catchError(err => { this.logger.error(this.source, 'getPublicOrgCatalog failed', err); throw err; })
    );
  }

  getPublicOrgCloverCatalog(slug: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/shop/public/${slug}/clover/catalog`).pipe(
      catchError(err => { this.logger.error(this.source, 'getPublicOrgCloverCatalog failed', err); throw err; })
    );
  }

  createPublicOrgPayment(slug: string, req: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/shop/public/${slug}/square/payments`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'createPublicOrgPayment failed', err); throw err; })
    );
  }

  createPublicOrgCloverOrder(slug: string, req: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/shop/public/${slug}/clover/orders`, req).pipe(
      catchError(err => { this.logger.error(this.source, 'createPublicOrgCloverOrder failed', err); throw err; })
    );
  }
}
