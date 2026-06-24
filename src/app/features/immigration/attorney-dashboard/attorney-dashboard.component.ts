import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember, OrgPartnership, PartnershipInviteRequest, AttorneyProfile, BarNumber } from '../../../models/imm-org.model';
import { ImmigrationService, ImmigrationCase, CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS, CapSeasonSummary } from '../../../services/immigration.service';
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
  capSeason: CapSeasonSummary | null = null;

  loading = true;
  error: string | null = null;

  inviteEmail = '';
  inviteRole = 'ATTORNEY';
  inviting = false;
  inviteResult: string | null = null;
  inviteError: string | null = null;

  showInviteEmployer = false;
  employerInviteEmail = '';
  sendingEmployerInvite = false;
  employerInviteResult: string | null = null;
  employerInviteError: string | null = null;

  // Tab state
  activeTab: 'cases' | 'employers' | 'team' | 'profile' = 'cases';

  // Attorney profile tab state
  attorneyProfile: AttorneyProfile | null = null;
  profileLoaded = false;
  profileLoading = false;
  profileSaving = false;
  profileSaveSuccess = false;
  profileSaveError: string | null = null;
  profileBio = '';
  barNumbers: BarNumber[] = [];

  readonly caseTypeLabels = CASE_TYPE_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statusCss = STATUS_CSS;

  constructor(
    private immOrgService: ImmOrgService,
    private immigrationService: ImmigrationService,
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
        if (this.lawFirmOrgs.length === 0) {
          this.router.navigate(['/immigration/attorney/setup']);
          return;
        }
        this.loading = false;
        this.selectOrg(this.lawFirmOrgs[0]);
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
    this.capSeason = null;
    this.activeTab = 'cases';
    this.profileLoaded = false;
    this.profileSaveSuccess = false;
    this.profileSaveError = null;
    this.loadCases();
    this.loadMembers();
    this.loadPartnerships();
    this.loadCapSeason();
  }

  setTab(tab: 'cases' | 'employers' | 'team' | 'profile'): void {
    this.activeTab = tab;
    if (tab === 'profile' && !this.profileLoaded) this.loadAttorneyProfile();
  }

  loadAttorneyProfile(): void {
    if (!this.selectedOrg) return;
    this.profileLoading = true;
    this.immOrgService.getAttorneyProfile(this.selectedOrg.id).subscribe({
      next: p => {
        this.attorneyProfile = p;
        this.profileBio = p.bio ?? '';
        this.barNumbers = Array.isArray(p.barNumbers) ? [...p.barNumbers] : [];
        this.profileLoading = false;
        this.profileLoaded = true;
      },
      error: () => { this.profileLoading = false; }
    });
  }

  addBarNumber(): void {
    this.barNumbers = [...this.barNumbers, { state: '', barNumber: '', admittedDate: '' }];
  }

  removeBarNumber(index: number): void {
    this.barNumbers = this.barNumbers.filter((_, i) => i !== index);
  }

  saveAttorneyProfile(): void {
    if (!this.selectedOrg) return;
    this.profileSaving = true;
    this.profileSaveSuccess = false;
    this.profileSaveError = null;
    const cleanedBars = this.barNumbers.filter(b => b.state.trim() || b.barNumber.trim());
    this.immOrgService.updateAttorneyProfile(this.selectedOrg.id, {
      barNumbers: cleanedBars,
      bio: this.profileBio
    }).subscribe({
      next: p => {
        this.attorneyProfile = p;
        this.profileSaving = false;
        this.profileSaveSuccess = true;
      },
      error: err => {
        this.profileSaving = false;
        this.profileSaveError = err?.error?.error || 'Failed to save profile';
      }
    });
  }

  loadCapSeason(): void {
    if (!this.selectedOrg) return;
    this.immigrationService.getCapSeasonSummary(this.selectedOrg.id).subscribe({
      next: s => { this.capSeason = s; },
      error: () => { /* non-fatal — widget just stays hidden */ }
    });
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

  inviteMember(): void {
    if (!this.selectedOrg || !this.inviteEmail.trim()) return;
    this.inviting = true;
    this.inviteError = null;
    this.inviteResult = null;
    this.immOrgService.inviteMember(this.selectedOrg.id, { email: this.inviteEmail.trim(), role: this.inviteRole }).subscribe({
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

  sendEmployerInvite(): void {
    if (!this.selectedOrg || !this.employerInviteEmail.trim()) return;
    this.sendingEmployerInvite = true;
    this.employerInviteError = null;
    this.employerInviteResult = null;
    const req: PartnershipInviteRequest = {
      lawFirmOrgId: this.selectedOrg.id,
      employerEmail: this.employerInviteEmail.trim()
    };
    this.immOrgService.inviteEmployer(req).subscribe({
      next: p => {
        this.sendingEmployerInvite = false;
        this.employerInviteEmail = '';
        const link = p.inviteToken
          ? `${window.location.origin}/immigration/employer/onboard/${p.inviteToken}`
          : '(check backend console for link)';
        this.employerInviteResult = `Invite sent! Share this link with the employer: ${link}`;
        this.loadPartnerships();
      },
      error: err => {
        this.sendingEmployerInvite = false;
        this.employerInviteError = err?.error?.error || 'Failed to send invite';
        this.logger.error(this.source, 'sendEmployerInvite failed', err);
      }
    });
  }
}
