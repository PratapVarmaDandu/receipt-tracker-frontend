import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember, OrgPartnership } from '../../../models/imm-org.model';
import { ImmigrationCase, CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS } from '../../../services/immigration.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-attorney-dashboard',
  templateUrl: './attorney-dashboard.component.html',
  styleUrls: ['./attorney-dashboard.component.scss']
})
export class AttorneyDashboardComponent implements OnInit {
  private readonly source = 'AttorneyDashboardComponent';

  lawFirmOrgs: ImmOrg[] = [];
  selectedOrg: ImmOrg | null = null;
  cases: ImmigrationCase[] = [];
  members: ImmOrgMember[] = [];
  partnerships: OrgPartnership[] = [];
  activeFilter: string | null = null;

  loading = true;
  error: string | null = null;

  showCreateOrg = false;
  newOrgName = '';
  creating = false;
  createError: string | null = null;

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
        this.lawFirmOrgs = orgs.filter(o => o.orgType === 'LAW_FIRM');
        this.loading = false;
        if (this.lawFirmOrgs.length > 0) this.selectOrg(this.lawFirmOrgs[0]);
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
    this.activeFilter = null;
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
        this.partnerships = ps.filter(p => p.lawFirmOrgId === this.selectedOrg?.id);
      },
      error: () => {}
    });
  }

  filteredCases(): ImmigrationCase[] {
    if (!this.activeFilter) return this.cases;
    return this.cases.filter(c => c.status === this.activeFilter);
  }

  statusFilters(): string[] {
    return [...new Set(this.cases.map(c => c.status))];
  }

  activePartnerships(): OrgPartnership[] {
    return this.partnerships.filter(p => p.status === 'ACTIVE');
  }

  pendingPartnerships(): OrgPartnership[] {
    return this.partnerships.filter(p => p.status === 'PENDING');
  }

  acceptPartnership(id: number): void {
    this.immOrgService.acceptPartnership(id).subscribe({
      next: () => this.loadPartnerships(),
      error: err => { this.logger.error(this.source, 'acceptPartnership failed', err); }
    });
  }

  endPartnership(id: number): void {
    this.immOrgService.endPartnership(id).subscribe({
      next: () => this.loadPartnerships(),
      error: err => { this.logger.error(this.source, 'endPartnership failed', err); }
    });
  }

  createOrg(): void {
    if (!this.newOrgName.trim()) return;
    this.creating = true;
    this.createError = null;
    this.immOrgService.createOrg({ name: this.newOrgName.trim(), orgType: 'LAW_FIRM' }).subscribe({
      next: org => {
        this.creating = false;
        this.showCreateOrg = false;
        this.newOrgName = '';
        this.lawFirmOrgs = [...this.lawFirmOrgs, org];
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
}
