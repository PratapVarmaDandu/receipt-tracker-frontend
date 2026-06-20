import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ImmOrg, ImmOrgMember, OrgPartnership,
  CreateImmOrgRequest, InviteMemberRequest, CreatePartnershipRequest,
  PartnershipInviteRequest, PartnershipJoinInfo, EmployerOnboardRequest
} from '../models/imm-org.model';
import { ImmigrationCase, I9Record, CreateI9RecordRequest } from './immigration.service';

const BASE = environment.backendUrl;
const OPTS = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class ImmOrgService {
  constructor(private http: HttpClient) {}

  createOrg(req: CreateImmOrgRequest): Observable<ImmOrg> {
    return this.http.post<ImmOrg>(`${BASE}/api/immigration/orgs`, req, OPTS);
  }

  listMine(): Observable<ImmOrg[]> {
    return this.http.get<ImmOrg[]>(`${BASE}/api/immigration/orgs/mine`, OPTS);
  }

  getById(id: number): Observable<ImmOrg> {
    return this.http.get<ImmOrg>(`${BASE}/api/immigration/orgs/${id}`, OPTS);
  }

  inviteMember(orgId: number, req: InviteMemberRequest): Observable<ImmOrgMember> {
    return this.http.post<ImmOrgMember>(`${BASE}/api/immigration/orgs/${orgId}/members`, req, OPTS);
  }

  listMembers(orgId: number): Observable<ImmOrgMember[]> {
    return this.http.get<ImmOrgMember[]>(`${BASE}/api/immigration/orgs/${orgId}/members`, OPTS);
  }

  removeMember(orgId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/api/immigration/orgs/${orgId}/members/${memberId}`, OPTS);
  }

  getJoinInfo(token: string): Observable<ImmOrgMember> {
    return this.http.get<ImmOrgMember>(`${BASE}/api/immigration/orgs/join/${token}`, OPTS);
  }

  acceptInvite(token: string): Observable<ImmOrgMember> {
    return this.http.post<ImmOrgMember>(`${BASE}/api/immigration/orgs/join/${token}`, {}, OPTS);
  }

  listPartnerships(): Observable<OrgPartnership[]> {
    return this.http.get<OrgPartnership[]>(`${BASE}/api/immigration/partnerships/mine`, OPTS);
  }

  createPartnership(req: CreatePartnershipRequest): Observable<OrgPartnership> {
    return this.http.post<OrgPartnership>(`${BASE}/api/immigration/partnerships`, req, OPTS);
  }

  acceptPartnership(id: number): Observable<OrgPartnership> {
    return this.http.put<OrgPartnership>(`${BASE}/api/immigration/partnerships/${id}/accept`, {}, OPTS);
  }

  endPartnership(id: number): Observable<void> {
    return this.http.put<void>(`${BASE}/api/immigration/partnerships/${id}/end`, {}, OPTS);
  }

  listCasesByOrg(orgId: number): Observable<ImmigrationCase[]> {
    return this.http.get<ImmigrationCase[]>(`${BASE}/api/immigration/cases/by-org/${orgId}`, OPTS);
  }

  inviteEmployer(req: PartnershipInviteRequest): Observable<OrgPartnership> {
    return this.http.post<OrgPartnership>(`${BASE}/api/immigration/partnerships/invite`, req, OPTS);
  }

  getOnboardInfo(token: string): Observable<PartnershipJoinInfo> {
    return this.http.get<PartnershipJoinInfo>(`${BASE}/api/immigration/partnerships/onboard/${token}`, OPTS);
  }

  completeOnboarding(token: string, req: EmployerOnboardRequest): Observable<OrgPartnership> {
    return this.http.post<OrgPartnership>(`${BASE}/api/immigration/partnerships/onboard/${token}`, req, OPTS);
  }

  // ── FEAT-M4: I-9 Compliance ───────────────────────────────────────────────

  createI9Record(orgId: number, req: CreateI9RecordRequest): Observable<I9Record> {
    return this.http.post<I9Record>(`${BASE}/api/immigration/orgs/${orgId}/i9`, req, OPTS);
  }

  listI9Records(orgId: number): Observable<I9Record[]> {
    return this.http.get<I9Record[]>(`${BASE}/api/immigration/orgs/${orgId}/i9`, OPTS);
  }

  updateI9Record(orgId: number, recordId: number, req: CreateI9RecordRequest): Observable<I9Record> {
    return this.http.put<I9Record>(`${BASE}/api/immigration/orgs/${orgId}/i9/${recordId}`, req, OPTS);
  }

  listExpiringI9Records(orgId: number, days = 90): Observable<I9Record[]> {
    return this.http.get<I9Record[]>(`${BASE}/api/immigration/orgs/${orgId}/i9/expiring?days=${days}`, OPTS);
  }

  // ── FEAT-M6: Org case export ──────────────────────────────────────────────

  exportOrgCases(orgId: number): Observable<Blob> {
    return this.http.get(`${BASE}/api/immigration/orgs/${orgId}/cases/export`, { ...OPTS, responseType: 'blob' });
  }
}
