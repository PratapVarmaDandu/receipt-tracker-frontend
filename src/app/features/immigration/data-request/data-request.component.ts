import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import {
  ImmigrationService, DataRequestPublicInfo
} from '../../../services/immigration.service';
import { LoggerService } from '../../../services/logger.service';
import { environment } from '../../../../environments/environment';

interface PassportEntry {
  id?: string; number?: string; country?: string;
  issueDate?: string; expiryDate?: string; notes?: string;
  documentIds?: number[];
}

interface TravelEntry {
  id?: string; portOfEntry?: string; i94Number?: string;
  entryDate?: string; admittedUntil?: string; visaClass?: string; notes?: string;
}

interface EmploymentEntry {
  employer?: string; title?: string; country?: string;
  startDate?: string; endDate?: string;
}

interface DependentEntry {
  name?: string; relationship?: string; dateOfBirth?: string; citizenshipCountry?: string;
}

@Component({
  selector: 'app-data-request',
  templateUrl: './data-request.component.html',
  styleUrls: ['./data-request.component.scss']
})
export class DataRequestComponent implements OnInit {
  private readonly source = 'DataRequestComponent';
  private readonly BACKEND = environment.backendUrl;

  token = '';
  publicInfo: DataRequestPublicInfo | null = null;
  loading = true;
  error: string | null = null;
  submitted = false;
  submitting = false;
  submitError: string | null = null;

  isAuthenticated = false;
  postLoginRedirectSet = false;

  currentStepIndex = 0;
  docUploading: number | null = null; // passport index being uploaded

  readonly SECTION_ORDER = [
    'personalInfo', 'passportI94', 'currentStatus',
    'employment', 'familyDependents', 'eadInfo', 'notificationPreferences'
  ];

  readonly SECTION_LABELS: Record<string, string> = {
    personalInfo: 'Personal Info',
    passportI94: 'Passport & I-94',
    currentStatus: 'Current Status',
    employment: 'Employment',
    familyDependents: 'Family / Dependents',
    eadInfo: 'EAD Info',
    notificationPreferences: 'Notification Preferences'
  };

  form = {
    personalInfo: {
      legalFirstName: '', legalLastName: '', middleName: '',
      dateOfBirth: '', countryOfBirth: '', citizenshipCountry: '',
      gender: '', phone: '',
      currentAddress: { line1: '', line2: '', city: '', state: '', zip: '', country: '' }
    },
    passportI94: {
      passports: [] as PassportEntry[],
      travelEntries: [] as TravelEntry[]
    },
    currentStatus: { currentVisaType: '', currentVisaExpiry: '' },
    employment: { employment: [] as EmploymentEntry[] },
    familyDependents: { dependents: [] as DependentEntry[] },
    eadInfo: { eadCategory: '', eadExpiryDate: '', eadCaseNumber: '' },
    notificationPreferences: {
      notificationEmailEnabled: true,
      notificationSmsEnabled: false,
      notificationPhone: ''
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private immigrationService: ImmigrationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.authService.currentUser().subscribe(u => {
      this.isAuthenticated = u !== null;
    });
    this.loadPublicInfo();
  }

  loadPublicInfo(): void {
    this.loading = true;
    this.immigrationService.getDataRequestByToken(this.token).subscribe({
      next: info => {
        this.publicInfo = info;
        this.loading = false;
        if (info.prefillData) this.prefillForm(info.prefillData as any);
      },
      error: err => {
        this.error = err?.error?.error || 'This link is invalid or has expired.';
        this.loading = false;
      }
    });
  }

  private prefillForm(profile: any): void {
    const pi = this.form.personalInfo;
    if (profile.legalFirstName)    pi.legalFirstName    = profile.legalFirstName;
    if (profile.legalLastName)     pi.legalLastName     = profile.legalLastName;
    if (profile.middleName)        pi.middleName        = profile.middleName;
    if (profile.dateOfBirth)       pi.dateOfBirth       = profile.dateOfBirth;
    if (profile.countryOfBirth)    pi.countryOfBirth    = profile.countryOfBirth;
    if (profile.citizenshipCountry) pi.citizenshipCountry = profile.citizenshipCountry;
    if (profile.gender)            pi.gender            = profile.gender;
    if (profile.phone)             pi.phone             = profile.phone;
    if (profile.currentAddress)    pi.currentAddress    = { ...pi.currentAddress, ...profile.currentAddress };

    if (profile.passports?.length) {
      this.form.passportI94.passports = profile.passports.map((p: any) => ({
        id: p.id, number: p.number, country: p.country,
        issueDate: p.issueDate, expiryDate: p.expiryDate, notes: p.notes,
        documentIds: p.documentIds ?? []
      }));
    }
    if (profile.travelEntries?.length) {
      this.form.passportI94.travelEntries = profile.travelEntries;
    }
    if (profile.currentVisaType)  this.form.currentStatus.currentVisaType  = profile.currentVisaType;
    if (profile.currentVisaExpiry) this.form.currentStatus.currentVisaExpiry = profile.currentVisaExpiry;
    if (profile.employment?.length) this.form.employment.employment = profile.employment;
    if (profile.dependents?.length) this.form.familyDependents.dependents = profile.dependents;
    if (profile.eadCategory)    this.form.eadInfo.eadCategory    = profile.eadCategory;
    if (profile.eadExpiryDate)  this.form.eadInfo.eadExpiryDate  = profile.eadExpiryDate;
    if (profile.eadCaseNumber)  this.form.eadInfo.eadCaseNumber  = profile.eadCaseNumber;
    this.form.notificationPreferences.notificationEmailEnabled = profile.notificationEmailEnabled ?? true;
    this.form.notificationPreferences.notificationSmsEnabled   = profile.notificationSmsEnabled   ?? false;
    if (profile.notificationPhone) this.form.notificationPreferences.notificationPhone = profile.notificationPhone;
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  get activeSections(): string[] {
    if (!this.publicInfo?.sections) return [];
    return this.SECTION_ORDER.filter(s => this.publicInfo!.sections.includes(s));
  }

  get steps(): string[] {
    return [...this.activeSections, 'review'];
  }

  get currentStep(): string {
    return this.steps[this.currentStepIndex] ?? 'review';
  }

  next(): void { if (this.currentStepIndex < this.steps.length - 1) this.currentStepIndex++; }
  prev(): void { if (this.currentStepIndex > 0) this.currentStepIndex--; }
  goTo(i: number): void { this.currentStepIndex = i; }

  get isLastStep(): boolean { return this.currentStepIndex === this.steps.length - 1; }

  stepLabel(step: string): string {
    return step === 'review' ? 'Review & Submit' : (this.SECTION_LABELS[step] ?? step);
  }

  // ── Passport helpers ──────────────────────────────────────────────────────

  addPassport(): void {
    this.form.passportI94.passports.push({ documentIds: [] });
  }

  removePassport(i: number): void {
    this.form.passportI94.passports.splice(i, 1);
  }

  addTravelEntry(): void {
    this.form.passportI94.travelEntries.push({});
  }

  removeTravelEntry(i: number): void {
    this.form.passportI94.travelEntries.splice(i, 1);
  }

  onPassportFilePick(passportIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', 'Passport document');
    formData.append('category', 'IMMIGRATION');
    this.docUploading = passportIndex;
    this.http.post<{ id: number }>(
      `${this.BACKEND}/api/documents/upload`, formData, { withCredentials: true }
    ).subscribe({
      next: doc => {
        const passport = this.form.passportI94.passports[passportIndex];
        if (!passport.documentIds) passport.documentIds = [];
        passport.documentIds.push(doc.id);
        this.docUploading = null;
      },
      error: () => { this.docUploading = null; }
    });
  }

  // ── Employment helpers ────────────────────────────────────────────────────

  addEmployment(): void  { this.form.employment.employment.push({}); }
  removeEmployment(i: number): void { this.form.employment.employment.splice(i, 1); }

  // ── Dependent helpers ─────────────────────────────────────────────────────

  addDependent(): void  { this.form.familyDependents.dependents.push({}); }
  removeDependent(i: number): void { this.form.familyDependents.dependents.splice(i, 1); }

  // ── Login redirect ────────────────────────────────────────────────────────

  login(): void {
    localStorage.setItem('postLoginRedirect', window.location.pathname);
    this.router.navigate(['/login']);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  doSubmit(): void {
    if (!this.isAuthenticated) { this.login(); return; }
    this.submitting = true;
    this.submitError = null;

    // Build sections payload — only include active sections
    const sections: Record<string, unknown> = {};
    const active = this.activeSections;
    if (active.includes('personalInfo'))          sections['personalInfo']          = this.form.personalInfo;
    if (active.includes('passportI94'))           sections['passportI94']           = this.form.passportI94;
    if (active.includes('currentStatus'))         sections['currentStatus']         = this.form.currentStatus;
    if (active.includes('employment'))            sections['employment']            = this.form.employment;
    if (active.includes('familyDependents'))      sections['familyDependents']      = this.form.familyDependents;
    if (active.includes('eadInfo'))               sections['eadInfo']               = this.form.eadInfo;
    if (active.includes('notificationPreferences')) sections['notificationPreferences'] = this.form.notificationPreferences;

    this.immigrationService.submitDataRequest(this.token, sections).subscribe({
      next: () => { this.submitted = true; this.submitting = false; },
      error: err => {
        this.submitError = err?.error?.error || 'Submission failed. Please try again.';
        this.submitting = false;
      }
    });
  }
}
