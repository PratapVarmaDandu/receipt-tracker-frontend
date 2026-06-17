import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember, OrgPartnership } from '../../../models/imm-org.model';
import { ImmigrationCase, CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS } from '../../../services/immigration.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-employer-dashboard',
  templateUrl: './employer-dashboard.component.html',
  styleUrls: ['./employer-dashboard.component.scss']
})
export class EmployerDashboardComponent implements OnInit {
  private readonly source = 'EmployerDashboardComponent';

  employerOrgs: ImmOrg[] = [];
  selectedOrg: ImmOrg | null = null;
  cases: ImmigrationCase[] = [];
  members: ImmOrgMember[] = [];
  partnerships: OrgPartnership[] = [];

  loading = true;
  error: string | null = null;

  // Create org inline form
  showCreateOrg = false;
  newOrgName = '';
  creating = false;
  createError: string | null = null;

  // Invite member
  inviteEmail = '';
  inviting = false;
  inviteResult: string | null = null;
  inviteError: string | null = null;

  readonly caseTypeLabels = CASE_TYPE_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statusCss = STATUS_CSS;

  constructor(
    private immOrgService: ImmOrgService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.loadOrgs();
  }

  loadOrgs(): void {
    this.loading = true;
    this.immOrgService.listMine().subscribe({
      next: orgs => {
        this.employerOrgs = orgs.filter(o => o.orgType === 'EMPLOYER');
        this.loading = false;
        if (this.employerOrgs.length > 0) this.selectOrg(this.employerOrgs[0]);
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to load organizations';
        this.loading = false;
        this.logger.error(this.source, 'loadOrgs failed', err);
      }
    });
  }

  selectOrg(org: ImmOrg): void {
    this.selectedOrg = org;
    this.loadCases();
    this.loadMembers();
    this.loadPartnerships();
  }

  loadCases(): void {
    if (!this.selectedOrg) return;
    this.immOrgService.listCasesByOrg(this.selectedOrg.id).subscribe({
      next: cases => { this.cases = cases; },
      error: err => { this.logger.error(this.source, 'loadCases failed', err); }
    });
  }

  loadMembers(): void {
    if (!this.selectedOrg) return;
    this.immOrgService.listMembers(this.selectedOrg.id).subscribe({
      next: members => { this.members = members; },
      error: () => {}
    });
  }

  loadPartnerships(): void {
    this.immOrgService.listPartnerships().subscribe({
      next: ps => {
        this.partnerships = ps.filter(p =>
          p.employerOrgId === this.selectedOrg?.id);
      },
      error: () => {}
    });
  }

  createOrg(): void {
    if (!this.newOrgName.trim()) return;
    this.creating = true;
    this.createError = null;
    this.immOrgService.createOrg({ name: this.newOrgName.trim(), orgType: 'EMPLOYER' }).subscribe({
      next: org => {
        this.creating = false;
        this.showCreateOrg = false;
        this.newOrgName = '';
        this.employerOrgs = [...this.employerOrgs, org];
        this.selectOrg(org);
      },
      error: err => {
        this.creating = false;
        this.createError = err?.error?.error || 'Failed to create organization';
      }
    });
  }

  inviteMember(): void {
    if (!this.selectedOrg || !this.inviteEmail.trim()) return;
    this.inviting = true;
    this.inviteError = null;
    this.inviteResult = null;
    this.immOrgService.inviteMember(this.selectedOrg.id, { email: this.inviteEmail.trim() }).subscribe({
      next: m => {
        this.inviting = false;
        this.inviteEmail = '';
        this.inviteResult = m.inviteToken
          ? `Invite created. Share this link: /immigration/orgs/join/${m.inviteToken}`
          : 'Team member added.';
        this.loadMembers();
      },
      error: err => {
        this.inviting = false;
        this.inviteError = err?.error?.error || 'Invite failed';
      }
    });
  }

  openCase(id: number): void {
    this.router.navigate(['/immigration/cases', id]);
  }

  activeMembersCount(): number {
    return this.members.filter(m => m.status === 'ACTIVE').length;
  }
}
