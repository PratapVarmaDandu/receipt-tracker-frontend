import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember, OrgPartnership } from '../../../models/imm-org.model';
import { ImmigrationCase, CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS, I9Record, CreateI9RecordRequest } from '../../../services/immigration.service';
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

  // I-9 compliance state (FEAT-M4)
  i9Records: I9Record[] = [];
  i9Loading = false;
  i9Loaded = false;
  showI9Section = false;
  showAddI9 = false;
  addingI9 = false;
  addI9Error: string | null = null;
  i9Form: CreateI9RecordRequest = {
    employeeEmail: '', employeeName: '', workAuthType: '',
    documentTitle: '', documentNumber: '', expiryDate: '', verifiedAt: ''
  };
  editingI9Id: number | null = null;
  editI9Form: CreateI9RecordRequest = {
    employeeEmail: '', employeeName: '', workAuthType: '',
    documentTitle: '', documentNumber: '', expiryDate: '', verifiedAt: ''
  };

  // Org CSV export state (FEAT-M6)
  exportingCsv = false;

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
    this.i9Loaded = false;
    this.i9Records = [];
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

  // ── I-9 Compliance (FEAT-M4) ────────────────────────────────────────────

  toggleI9Section(): void {
    this.showI9Section = !this.showI9Section;
    if (this.showI9Section && !this.i9Loaded) this.loadI9Records();
  }

  loadI9Records(): void {
    if (!this.selectedOrg) return;
    this.i9Loading = true;
    this.immOrgService.listI9Records(this.selectedOrg.id).subscribe({
      next: recs => { this.i9Records = recs; this.i9Loading = false; this.i9Loaded = true; },
      error: () => { this.i9Loading = false; }
    });
  }

  i9StatusCss(status: string): string {
    return status === 'CURRENT' ? 'bg-success' : status === 'EXPIRING_SOON' ? 'bg-warning text-dark' : 'bg-danger';
  }

  i9StatusLabel(status: string): string {
    return status === 'CURRENT' ? 'Current' : status === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Expired';
  }

  get i9SummaryExpiring(): number {
    return this.i9Records.filter(r => r.status === 'EXPIRING_SOON').length;
  }

  get i9SummaryExpired(): number {
    return this.i9Records.filter(r => r.status === 'EXPIRED').length;
  }

  submitAddI9(): void {
    if (!this.selectedOrg || !this.i9Form.employeeEmail || !this.i9Form.employeeName) return;
    this.addingI9 = true;
    this.addI9Error = null;
    this.immOrgService.createI9Record(this.selectedOrg.id, this.i9Form).subscribe({
      next: rec => {
        this.i9Records = [rec, ...this.i9Records];
        this.showAddI9 = false;
        this.i9Form = { employeeEmail: '', employeeName: '', workAuthType: '', documentTitle: '', documentNumber: '', expiryDate: '', verifiedAt: '' };
        this.addingI9 = false;
      },
      error: err => {
        this.addI9Error = err?.error?.error || 'Failed to create I-9 record';
        this.addingI9 = false;
      }
    });
  }

  startEditI9(rec: I9Record): void {
    this.editingI9Id = rec.id;
    this.editI9Form = {
      employeeEmail: rec.employeeEmail,
      employeeName: rec.employeeName,
      workAuthType: rec.workAuthType || '',
      documentTitle: rec.documentTitle || '',
      documentNumber: rec.documentNumber || '',
      expiryDate: rec.expiryDate || '',
      verifiedAt: rec.verifiedAt || ''
    };
  }

  cancelEditI9(): void { this.editingI9Id = null; }

  saveEditI9(recId: number): void {
    if (!this.selectedOrg) return;
    this.immOrgService.updateI9Record(this.selectedOrg.id, recId, this.editI9Form).subscribe({
      next: updated => {
        this.i9Records = this.i9Records.map(r => r.id === recId ? updated : r);
        this.editingI9Id = null;
      },
      error: err => { this.logger.error(this.source, 'updateI9Record failed', err); }
    });
  }

  // ── Org CSV export (FEAT-M6) ─────────────────────────────────────────────

  exportCases(): void {
    if (!this.selectedOrg || this.exportingCsv) return;
    this.exportingCsv = true;
    this.immOrgService.exportOrgCases(this.selectedOrg.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `org-${this.selectedOrg!.id}-cases.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportingCsv = false;
      },
      error: err => {
        this.logger.error(this.source, 'exportCases failed', err);
        this.exportingCsv = false;
      }
    });
  }
}
