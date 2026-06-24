import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrg, BarNumber } from '../../../models/imm-org.model';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-law-firm-setup',
  templateUrl: './law-firm-setup.component.html',
  styleUrls: ['./law-firm-setup.component.scss']
})
export class LawFirmSetupComponent implements OnInit {
  private readonly source = 'LawFirmSetupComponent';

  currentStep = 1;
  createdOrg: ImmOrg | null = null;

  // Step 1 — Firm Details
  firmName = '';
  website = '';
  address = '';
  city = '';
  stateCode = '';
  zipCode = '';
  step1Submitted = false;
  step1Saving = false;
  step1Error: string | null = null;

  // Step 2 — Attorney Profile
  profileBio = '';
  barNumbers: BarNumber[] = [{ state: '', barNumber: '', admittedDate: '' }];
  step2Saving = false;
  step2Error: string | null = null;

  // Step 3 — Invite Team
  invites: { email: string; role: string }[] = [{ email: '', role: 'ATTORNEY' }];
  step3Saving = false;
  step3Error: string | null = null;

  readonly US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  constructor(
    private immOrgService: ImmOrgService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.immOrgService.listMine().subscribe({
      next: orgs => {
        const existing = orgs.find(o => o.orgType === 'LAW_FIRM');
        if (existing) {
          this.router.navigate(['/immigration/attorney']);
        }
      },
      error: () => {}
    });
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────

  get step1Valid(): boolean {
    return !!this.firmName.trim();
  }

  submitStep1(): void {
    this.step1Submitted = true;
    if (!this.step1Valid || this.step1Saving) return;
    this.step1Saving = true;
    this.step1Error = null;

    const profilePatch = {
      website:   this.website.trim()   || undefined,
      address:   this.address.trim()   || undefined,
      city:      this.city.trim()      || undefined,
      stateCode: this.stateCode        || undefined,
      zipCode:   this.zipCode.trim()   || undefined,
    };
    const hasDetails = Object.values(profilePatch).some(v => v !== undefined);

    const applyDetails = (org: ImmOrg) => {
      if (!hasDetails) {
        this.createdOrg = org;
        this.step1Saving = false;
        this.currentStep = 2;
        return;
      }
      this.immOrgService.updateOrgProfile(org.id, profilePatch).subscribe({
        next: updated => {
          this.createdOrg = updated;
          this.step1Saving = false;
          this.currentStep = 2;
        },
        error: () => {
          // Address update is non-fatal — org exists, move on
          this.createdOrg = org;
          this.step1Saving = false;
          this.currentStep = 2;
        }
      });
    };

    if (this.createdOrg) {
      // User navigated back — patch the existing org
      this.immOrgService.updateOrgProfile(this.createdOrg.id, {
        name: this.firmName.trim(),
        ...profilePatch
      }).subscribe({
        next: updated => applyDetails(updated),
        error: err => {
          this.step1Saving = false;
          this.step1Error = err?.error?.error || 'Failed to update firm details. Please try again.';
        }
      });
      return;
    }

    this.immOrgService.createOrg({ name: this.firmName.trim(), orgType: 'LAW_FIRM' }).subscribe({
      next: org => applyDetails(org),
      error: err => {
        this.step1Saving = false;
        this.step1Error = err?.error?.error || 'Failed to create law firm. Please try again.';
      }
    });
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  addBarNumber(): void {
    this.barNumbers = [...this.barNumbers, { state: '', barNumber: '', admittedDate: '' }];
  }

  removeBarNumber(index: number): void {
    this.barNumbers = this.barNumbers.filter((_, i) => i !== index);
  }

  submitStep2(): void {
    if (!this.createdOrg || this.step2Saving) return;
    this.step2Saving = true;
    this.step2Error = null;
    const cleanedBars = this.barNumbers.filter(b => b.state.trim() || b.barNumber.trim());
    this.immOrgService.updateAttorneyProfile(this.createdOrg.id, {
      barNumbers: cleanedBars,
      bio: this.profileBio.trim() || undefined,
    }).subscribe({
      next: () => {
        this.step2Saving = false;
        this.currentStep = 3;
      },
      error: err => {
        this.step2Saving = false;
        this.step2Error = err?.error?.error || 'Failed to save profile. You can update this from the dashboard.';
      }
    });
  }

  skipStep2(): void {
    this.currentStep = 3;
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────

  addInviteRow(): void {
    this.invites = [...this.invites, { email: '', role: 'ATTORNEY' }];
  }

  removeInviteRow(index: number): void {
    if (this.invites.length <= 1) return;
    this.invites = this.invites.filter((_, i) => i !== index);
  }

  get filledInvites(): { email: string; role: string }[] {
    return this.invites.filter(i => i.email.trim());
  }

  submitStep3(): void {
    if (!this.createdOrg || this.step3Saving) return;
    const toSend = this.filledInvites;
    if (toSend.length === 0) {
      this.currentStep = 4;
      return;
    }
    this.step3Saving = true;
    this.step3Error = null;

    const sendNext = (index: number) => {
      if (index >= toSend.length) {
        this.step3Saving = false;
        this.currentStep = 4;
        return;
      }
      this.immOrgService.inviteMember(this.createdOrg!.id, {
        email: toSend[index].email.trim(),
        role:  toSend[index].role,
      }).subscribe({
        next:  () => sendNext(index + 1),
        error: () => sendNext(index + 1), // non-fatal — continue with remaining
      });
    };
    sendNext(0);
  }

  skipStep3(): void {
    this.currentStep = 4;
  }

  // ── Step 4 ────────────────────────────────────────────────────────────────

  goToDashboard(): void {
    this.router.navigate(['/immigration/attorney']);
  }
}
