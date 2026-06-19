import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ImmigrationService, ImmigrationCase, CASE_TYPE_LABELS, CASE_TYPE_GROUPS } from '../../../services/immigration.service';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember, OrgPartnership } from '../../../models/imm-org.model';
import { LoggerService } from '../../../services/logger.service';

const DEPENDENT_TYPES = ['H4', 'H4_EAD'];
const H4_EAD_TYPES    = ['H4_EAD'];

interface PartnerOrg { id: number; name: string; }

@Component({
  selector: 'app-case-form',
  templateUrl: './case-form.component.html',
  styleUrls: ['./case-form.component.scss']
})
export class CaseFormComponent implements OnInit {
  private readonly source = 'CaseFormComponent';

  // Form fields
  caseType = '';
  beneficiaryEmail = '';
  employerImmOrgId: number | null = null;
  lawFirmImmOrgId: number | null = null;
  parentCaseId: number | null = null;
  assignedAttorneyMemberId: number | null = null;

  // State
  loading = true;
  submitting = false;
  loadError: string | null = null;
  submitError: string | null = null;

  // Conflict check state (FEAT-QW5)
  conflictChecking = false;
  conflictResults: ImmigrationCase[] | null = null;
  conflictError: string | null = null;

  // Org data
  myOrgs: ImmOrg[] = [];
  partnerships: OrgPartnership[] = [];
  lawFirmMembers: ImmOrgMember[] = [];

  // Derived lists built from partnerships
  partnerLawFirms: PartnerOrg[] = [];    // for employer: law firms they have partnership with
  partnerEmployerOrgs: PartnerOrg[] = []; // for attorney: employers linked via partnership

  // Parent case list (for H4/H4-EAD)
  parentCases: { id: number; label: string; i140Approved: boolean }[] = [];

  readonly caseTypeGroups = CASE_TYPE_GROUPS;
  readonly caseTypeLabels = CASE_TYPE_LABELS;

  get employerOrgs(): ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'EMPLOYER'); }
  get lawFirmOrgs():  ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'LAW_FIRM'); }

  /** Caller is in a law firm but not an employer org */
  get isAttorney(): boolean { return this.lawFirmOrgs.length > 0 && this.employerOrgs.length === 0; }
  /** Caller is in an employer org but not a law firm */
  get isEmployer(): boolean { return this.employerOrgs.length > 0 && this.lawFirmOrgs.length === 0; }

  get needsParentCase(): boolean { return DEPENDENT_TYPES.includes(this.caseType); }
  get isH4Ead(): boolean { return H4_EAD_TYPES.includes(this.caseType); }

  get parentCaseI140Warning(): boolean {
    if (!this.isH4Ead || !this.parentCaseId) return false;
    const parent = this.parentCases.find(p => p.id === this.parentCaseId);
    return parent != null && !parent.i140Approved;
  }

  // For attorney: the name of their own law firm (auto-set, shown read-only)
  get myLawFirmName(): string {
    return this.lawFirmOrgs[0]?.name ?? '';
  }

  // For attorney: their own member name (self-assigned)
  get myMemberLabel(): string {
    const org = this.lawFirmOrgs[0];
    return org ? `Self (me)` : '';
  }

  constructor(
    private immigrationService: ImmigrationService,
    private immOrgService: ImmOrgService,
    private router: Router,
    private route: ActivatedRoute,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');

    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) this.beneficiaryEmail = emailParam;

    forkJoin({
      orgs: this.immOrgService.listMine(),
      cases: this.immigrationService.listCases(),
      partnerships: this.immOrgService.listPartnerships()
    }).subscribe({
      next: ({ orgs, cases, partnerships }) => {
        this.myOrgs = orgs;
        this.partnerships = partnerships.filter(p => p.status === 'ACTIVE');
        this.loading = false;

        // Build parent case list
        this.parentCases = cases
          .filter(c => ['H1B_INITIAL', 'H1B_EXTENSION', 'H1B_TRANSFER'].includes(c.caseType))
          .map(c => ({
            id: c.id,
            label: `${c.caseNumber} — ${c.beneficiaryName ?? c.beneficiaryEmail ?? ''} (${this.caseTypeLabels[c.caseType]})`,
            i140Approved: c.i140Approved
          }));

        if (orgs.length === 0) {
          this.loadError = 'You must belong to an employer or law firm organization to open cases.';
          return;
        }

        if (this.isEmployer) {
          // Auto-select employer
          if (this.employerOrgs.length === 1) this.employerImmOrgId = this.employerOrgs[0].id;
          // Build partner law firms from partnerships
          const myEmployerIds = new Set(this.employerOrgs.map(o => o.id));
          const seen = new Set<number>();
          this.partnerships.forEach(p => {
            if (p.employerOrgId != null && myEmployerIds.has(p.employerOrgId) && !seen.has(p.lawFirmOrgId)) {
              seen.add(p.lawFirmOrgId);
              this.partnerLawFirms.push({ id: p.lawFirmOrgId, name: p.lawFirmOrgName });
            }
          });
        }

        if (this.isAttorney) {
          // Auto-select own law firm
          const myLawFirm = this.lawFirmOrgs[0];
          if (myLawFirm) {
            this.lawFirmImmOrgId = myLawFirm.id;
            this.assignedAttorneyMemberId = myLawFirm.myMemberId;
            this.loadLawFirmMembers(myLawFirm.id);
          }
          // Build partner employer orgs from active partnerships only (pending invites have no employerOrgId)
          const myLawFirmIds = new Set(this.lawFirmOrgs.map(o => o.id));
          const seen = new Set<number>();
          this.partnerships.forEach(p => {
            if (p.employerOrgId != null && myLawFirmIds.has(p.lawFirmOrgId) && !seen.has(p.employerOrgId)) {
              seen.add(p.employerOrgId);
              this.partnerEmployerOrgs.push({ id: p.employerOrgId, name: p.employerOrgName });
            }
          });
        }
      },
      error: err => {
        this.loading = false;
        this.loadError = 'Failed to load organizations. Please try again.';
        this.logger.error(this.source, 'init load failed', err);
      }
    });
  }

  onLawFirmChange(): void {
    this.assignedAttorneyMemberId = null;
    this.lawFirmMembers = [];
    if (!this.lawFirmImmOrgId) return;
    this.loadLawFirmMembers(this.lawFirmImmOrgId);
  }

  private loadLawFirmMembers(orgId: number): void {
    this.immOrgService.listMembers(orgId).subscribe({
      next: members => { this.lawFirmMembers = members.filter(m => m.status === 'ACTIVE'); },
      error: () => {}
    });
  }

  submit(): void {
    if (!this.caseType || !this.beneficiaryEmail.trim()) return;
    if (this.isH4Ead && this.parentCaseI140Warning) return;
    if (this.isEmployer && !this.lawFirmImmOrgId) {
      this.submitError = 'Please select a law firm.';
      return;
    }
    if (this.isAttorney && !this.employerImmOrgId) {
      this.submitError = 'Please select the sponsoring employer.';
      return;
    }

    this.submitting = true;
    this.submitError = null;

    this.immigrationService.createCase({
      caseType: this.caseType,
      beneficiaryEmail: this.beneficiaryEmail.trim().toLowerCase(),
      employerImmOrgId: this.employerImmOrgId,
      lawFirmImmOrgId: this.lawFirmImmOrgId,
      parentCaseId: this.needsParentCase ? this.parentCaseId : null,
      assignedAttorneyMemberId: this.assignedAttorneyMemberId
    }).subscribe({
      next: created => {
        this.logger.info(this.source, `Case created: ${created.caseNumber}`);
        this.router.navigate(['/immigration/cases', created.id]);
      },
      error: err => {
        this.submitError = err?.error?.error || 'Failed to create case';
        this.submitting = false;
        this.logger.error(this.source, 'createCase failed', err);
      }
    });
  }

  runConflictCheck(): void {
    if (!this.beneficiaryEmail.trim() && !this.employerImmOrgId) return;
    this.conflictChecking = true;
    this.conflictResults = null;
    this.conflictError = null;
    this.immigrationService.checkConflict({
      beneficiaryEmail: this.beneficiaryEmail.trim().toLowerCase(),
      employerOrgId: this.employerImmOrgId
    }).subscribe({
      next: results => {
        this.conflictResults = results;
        this.conflictChecking = false;
        this.logger.info(this.source, `Conflict check: ${results.length} match(es)`);
      },
      error: err => {
        this.conflictError = err?.error?.error || 'Conflict check failed';
        this.conflictChecking = false;
        this.logger.error(this.source, 'conflictCheck failed', err);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/immigration']);
  }
}
