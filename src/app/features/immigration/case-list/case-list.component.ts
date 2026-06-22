import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmigrationService, ImmigrationCase, CASE_TYPE_LABELS, STATUS_LABELS, STATUS_CSS } from '../../../services/immigration.service';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg } from '../../../models/imm-org.model';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-case-list',
  templateUrl: './case-list.component.html',
  styleUrls: ['./case-list.component.scss']
})
export class CaseListComponent implements OnInit {
  private readonly source = 'CaseListComponent';

  cases: ImmigrationCase[] = [];
  loading = true;
  error: string | null = null;

  // Pending beneficiary invites (issue 2 — in-app notification)
  accepting: Record<number, boolean> = {};
  acceptInviteError: string | null = null;

  // Org membership — drives header buttons and role bar
  myOrgs: ImmOrg[] = [];
  get hasEmployerOrg(): boolean { return this.myOrgs.some(o => o.orgType === 'EMPLOYER'); }
  get hasLawFirmOrg():  boolean { return this.myOrgs.some(o => o.orgType === 'LAW_FIRM'); }
  get isOrgMember():    boolean { return this.myOrgs.length > 0; }
  get employerOrgs():   ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'EMPLOYER'); }
  get lawFirmOrgs():    ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'LAW_FIRM'); }

  readonly caseTypeLabels = CASE_TYPE_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly statusCss = STATUS_CSS;

  constructor(
    private immigrationService: ImmigrationService,
    private immOrgService: ImmOrgService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.loadCases();
    this.loadOrgMembership();
  }

  loadCases(): void {
    this.loading = true;
    this.error = null;
    this.immigrationService.listCases().subscribe({
      next: cases => {
        this.cases = cases;
        this.loading = false;
        this.logger.info(this.source, `Loaded ${cases.length} cases`);
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to load cases';
        this.loading = false;
        this.logger.error(this.source, 'loadCases failed', err);
      }
    });
  }

  private loadOrgMembership(): void {
    this.immOrgService.listMine().subscribe({
      next: orgs => { this.myOrgs = orgs; },
      error: () => { /* silently ignore — myOrgs stays [] → beneficiary view */ }
    });
  }

  openCase(id: number): void {
    this.router.navigate(['/immigration/cases', id]);
  }

  // ── Pending invites (beneficiary view) ───────────────────────────────────

  /** Cases the logged-in beneficiary has been invited to but not yet accepted. */
  get pendingInvites(): ImmigrationCase[] {
    return this.cases.filter(c => c.beneficiaryInvitePending);
  }

  acceptInvite(caseId: number, event: Event): void {
    event.stopPropagation();
    this.accepting[caseId] = true;
    this.acceptInviteError = null;
    this.immigrationService.acceptCaseInviteById(caseId).subscribe({
      next: () => {
        this.accepting[caseId] = false;
        this.logger.info(this.source, `Accepted invite for case ${caseId}`);
        this.loadCases();
      },
      error: err => {
        this.accepting[caseId] = false;
        this.acceptInviteError = err?.error?.error || 'Could not accept invite';
        this.logger.error(this.source, 'acceptInvite failed', err);
      }
    });
  }

  newCase(): void {
    this.router.navigate(['/immigration/cases/new']);
  }

  // ── Family tree helpers (FEAT-QW6) ───────────────────────────────────────

  get primaryCases(): ImmigrationCase[] {
    return this.cases.filter(c => !c.parentCaseId);
  }

  /** Dependent cases whose parent IS in the current visible list. */
  dependentsOf(caseId: number): ImmigrationCase[] {
    return this.cases.filter(c => c.parentCaseId === caseId);
  }

  /** Dependents whose parent is NOT in this list (e.g. parent on a different page/not accessible). */
  get orphanDependents(): ImmigrationCase[] {
    const knownIds = new Set(this.cases.map(c => c.id));
    return this.cases.filter(c => c.parentCaseId != null && !knownIds.has(c.parentCaseId));
  }
}
