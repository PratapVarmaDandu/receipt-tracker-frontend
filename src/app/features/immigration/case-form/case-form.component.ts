import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ImmigrationService, CASE_TYPE_LABELS, CASE_TYPE_GROUPS } from '../../../services/immigration.service';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, ImmOrgMember } from '../../../models/imm-org.model';
import { LoggerService } from '../../../services/logger.service';

const DEPENDENT_TYPES = ['H4', 'H4_EAD'];
const H4_EAD_TYPES    = ['H4_EAD'];

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

  // Org data
  myOrgs: ImmOrg[] = [];
  lawFirmMembers: ImmOrgMember[] = [];

  // Parent case list (for H4/H4-EAD)
  parentCases: { id: number; label: string; i140Approved: boolean }[] = [];

  readonly caseTypeGroups = CASE_TYPE_GROUPS;
  readonly caseTypeLabels = CASE_TYPE_LABELS;

  get employerOrgs(): ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'EMPLOYER'); }
  get lawFirmOrgs():  ImmOrg[] { return this.myOrgs.filter(o => o.orgType === 'LAW_FIRM'); }
  get needsParentCase(): boolean { return DEPENDENT_TYPES.includes(this.caseType); }
  get isH4Ead(): boolean { return H4_EAD_TYPES.includes(this.caseType); }

  // H4-EAD warning: parent case must have I-140 approved
  get parentCaseI140Warning(): boolean {
    if (!this.isH4Ead || !this.parentCaseId) return false;
    const parent = this.parentCases.find(p => p.id === this.parentCaseId);
    return parent != null && !parent.i140Approved;
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

    // Pre-fill beneficiary email from query param (e.g. from employer dashboard)
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) this.beneficiaryEmail = emailParam;

    forkJoin({
      orgs: this.immOrgService.listMine(),
      cases: this.immigrationService.listCases()
    }).subscribe({
      next: ({ orgs, cases }) => {
        this.myOrgs = orgs;
        this.loading = false;

        // Auto-select single org
        if (this.employerOrgs.length === 1) this.employerImmOrgId = this.employerOrgs[0].id;
        if (this.lawFirmOrgs.length === 1)  this.lawFirmImmOrgId  = this.lawFirmOrgs[0].id;

        // Build parent case list (H1B cases accessible to this user)
        this.parentCases = cases
          .filter(c => ['H1B_INITIAL', 'H1B_EXTENSION', 'H1B_TRANSFER'].includes(c.caseType))
          .map(c => ({
            id: c.id,
            label: `${c.caseNumber} — ${c.beneficiaryName ?? c.beneficiaryEmail ?? ''} (${this.caseTypeLabels[c.caseType]})`,
            i140Approved: c.i140Approved
          }));

        if (orgs.length === 0) {
          this.loadError = 'You must belong to an employer or law firm organization to open cases.';
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
    this.immOrgService.listMembers(this.lawFirmImmOrgId).subscribe({
      next: members => {
        this.lawFirmMembers = members.filter(m => m.status === 'ACTIVE');
      },
      error: () => {}
    });
  }

  submit(): void {
    if (!this.caseType || !this.beneficiaryEmail.trim()) return;
    if (this.isH4Ead && this.parentCaseI140Warning) return;

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

  cancel(): void {
    this.router.navigate(['/immigration']);
  }
}
