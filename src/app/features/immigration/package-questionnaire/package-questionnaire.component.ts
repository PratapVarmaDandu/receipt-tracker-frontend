import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImmigrationService, QuestionnairePublicSpec, QuestionnaireSection, QuestionnaireQuestion, ScanResult } from '../../../services/immigration.service';
import { AuthService } from '../../../services/auth.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-package-questionnaire',
  templateUrl: './package-questionnaire.component.html',
  styleUrls: ['./package-questionnaire.component.scss']
})
export class PackageQuestionnaireComponent implements OnInit {

  private readonly source = 'PackageQuestionnaireComponent';

  token = '';
  spec: QuestionnairePublicSpec | null = null;
  loading = true;
  error: string | null = null;
  expired = false;
  alreadySubmitted = false;

  // Answers keyed by question key
  answers: Record<string, string> = {};
  // LIST question rows keyed by question key; serialized to JSON on submit
  listRows: Record<string, Array<Record<string, string>>> = {};
  // Whether the user has verified each prefilled answer
  verified: Record<string, boolean> = {};
  // Show/hide toggle for TEXT_SENSITIVE fields
  showSensitive: Record<string, boolean> = {};

  activeSection = 0;
  submitting = false;
  submitted = false;
  submitError: string | null = null;

  currentUser: unknown = null;
  showLoginPrompt = false;

  // ── Passport scan ─────────────────────────────────────────────────────────
  scanLoading = false;
  scanError: string | null = null;
  scanResult: ScanResult | null = null;
  scanApplySelections: Record<string, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immigrationService: ImmigrationService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.authService.currentUser().subscribe(user => { this.currentUser = user; });
    this.loadQuestionnaire();
  }

  loadQuestionnaire(): void {
    this.immigrationService.getPublicQuestionnaire(this.token).subscribe({
      next: spec => {
        this.spec = spec;
        this.loading = false;
        if (spec.status === 'SUBMITTED') { this.alreadySubmitted = true; return; }
        this.prefillAnswers(spec);
      },
      error: err => {
        this.loading = false;
        if (err.status === 410) { this.expired = true; return; }
        this.error = err.error?.message || 'Failed to load questionnaire. The link may be invalid.';
      }
    });
  }

  prefillAnswers(spec: QuestionnairePublicSpec): void {
    for (const section of spec.sections) {
      for (const q of section.questions) {
        if (q.type === 'LIST') {
          this.listRows[q.key] = this.parseListPrefill(q.prefillValue);
          if (this.listRows[q.key].length > 0) this.verified[q.key] = false;
          continue;
        }
        if (q.prefillValue && q.type !== 'TEXT_SENSITIVE') {
          this.answers[q.key] = q.prefillValue;
          this.verified[q.key] = false; // must explicitly verify
        }
      }
    }
  }

  private parseListPrefill(prefillValue?: string): Array<Record<string, string>> {
    if (!prefillValue) return [];
    try {
      const rows = JSON.parse(prefillValue);
      if (!Array.isArray(rows)) return [];
      return rows.map(r => {
        const row: Record<string, string> = {};
        for (const [k, v] of Object.entries(r || {})) {
          if (v !== null && v !== undefined) row[k] = String(v);
        }
        return row;
      });
    } catch {
      this.logger.error(this.source, 'Could not parse LIST prefill value');
      return [];
    }
  }

  // ── LIST question rows ────────────────────────────────────────────────────

  rowsFor(q: QuestionnaireQuestion): Array<Record<string, string>> {
    if (!this.listRows[q.key]) this.listRows[q.key] = [];
    return this.listRows[q.key];
  }

  canAddRow(q: QuestionnaireQuestion): boolean {
    return this.rowsFor(q).length < (q.maxRows ?? 10);
  }

  addRow(q: QuestionnaireQuestion): void {
    if (this.canAddRow(q)) this.rowsFor(q).push({});
  }

  removeRow(q: QuestionnaireQuestion, index: number): void {
    this.rowsFor(q).splice(index, 1);
  }

  private rowHasContent(row: Record<string, string>): boolean {
    return Object.values(row).some(v => v !== null && v !== undefined && v.trim() !== '');
  }

  /** Rows the user actually filled in — blank rows are ignored. */
  filledRows(q: QuestionnaireQuestion): Array<Record<string, string>> {
    return this.rowsFor(q).filter(r => this.rowHasContent(r));
  }

  /** Question labels whose filled rows are missing a required column. */
  private get incompleteListQuestions(): string[] {
    return this.sections.flatMap(s => s.questions)
      .filter(q => q.type === 'LIST' && (q.itemFields || []).some(f => f.required)
        && this.filledRows(q).some(row =>
            (q.itemFields || []).some(f => f.required && !(row[f.key] || '').trim())))
      .map(q => q.label);
  }

  get sections(): QuestionnaireSection[] {
    return this.spec?.sections || [];
  }

  get activeSecObj(): QuestionnaireSection | null {
    return this.sections[this.activeSection] || null;
  }

  sectionProgress(section: QuestionnaireSection): number {
    const total = section.questions.length;
    if (total === 0) return 100;
    const filled = section.questions.filter(q => this.hasAnswer(q)).length;
    return Math.round((filled / total) * 100);
  }

  hasAnswer(q: QuestionnaireQuestion): boolean {
    if (q.type === 'LIST') return this.filledRows(q).length > 0;
    const v = this.answers[q.key];
    return v !== undefined && v !== null && v !== '';
  }

  isPrefilled(q: QuestionnaireQuestion): boolean {
    return !!q.prefillValue && q.type !== 'TEXT_SENSITIVE';
  }

  isVerified(q: QuestionnaireQuestion): boolean {
    return this.verified[q.key] === true;
  }

  toggleVerify(q: QuestionnaireQuestion): void {
    this.verified[q.key] = !this.verified[q.key];
  }

  toggleSensitive(key: string): void {
    this.showSensitive[key] = !this.showSensitive[key];
  }

  sensitiveInputType(key: string): string {
    return this.showSensitive[key] ? 'text' : 'password';
  }

  goNext(): void {
    if (this.activeSection < this.sections.length - 1) {
      this.activeSection++;
      window.scrollTo(0, 0);
    }
  }

  goPrev(): void {
    if (this.activeSection > 0) {
      this.activeSection--;
      window.scrollTo(0, 0);
    }
  }

  isLastSection(): boolean {
    return this.activeSection === this.sections.length - 1;
  }

  get totalProgress(): number {
    if (!this.spec) return 0;
    const allQ = this.sections.flatMap(s => s.questions);
    const total = allQ.length;
    if (total === 0) return 100;
    const filled = allQ.filter(q => this.hasAnswer(q)).length;
    return Math.round((filled / total) * 100);
  }

  get missingRequired(): string[] {
    if (!this.spec) return [];
    return this.sections.flatMap(s => s.questions)
      .filter(q => q.required && !this.hasAnswer(q))
      .map(q => q.label);
  }

  get unverifiedPrefills(): QuestionnaireQuestion[] {
    if (!this.spec) return [];
    return this.sections.flatMap(s => s.questions)
      .filter(q => this.isPrefilled(q) && !this.isVerified(q) && this.hasAnswer(q));
  }

  doSubmit(): void {
    if (!this.currentUser) {
      localStorage.setItem('postLoginRedirect', window.location.href);
      this.showLoginPrompt = true;
      return;
    }

    const missing = this.missingRequired;
    if (missing.length > 0) {
      this.submitError = 'Please fill in all required fields: ' + missing.join(', ');
      return;
    }

    const unverified = this.unverifiedPrefills;
    if (unverified.length > 0) {
      this.submitError = 'Please verify all pre-filled answers by checking the verify box: '
        + unverified.map(q => q.label).join(', ');
      return;
    }

    const incompleteLists = this.incompleteListQuestions;
    if (incompleteLists.length > 0) {
      this.submitError = 'Please complete the required columns in every row of: '
        + incompleteLists.join(', ');
      return;
    }

    // LIST answers are serialized JSON arrays of the filled rows
    const payload: Record<string, string> = { ...this.answers };
    for (const section of this.sections) {
      for (const q of section.questions) {
        if (q.type !== 'LIST') continue;
        const rows = this.filledRows(q);
        if (rows.length > 0) payload[q.key] = JSON.stringify(rows);
        else delete payload[q.key];
      }
    }

    this.submitting = true;
    this.submitError = null;

    this.immigrationService.submitPublicQuestionnaire(this.token, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: err => {
        this.submitting = false;
        this.submitError = err.error?.message || 'Submission failed. Please try again.';
      }
    });
  }

  goToLogin(): void {
    localStorage.setItem('postLoginRedirect', window.location.href);
    this.router.navigate(['/login']);
  }

  // ── Passport scan methods ─────────────────────────────────────────────────
  onScanFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.scanLoading = true;
    this.scanError = null;
    this.scanResult = null;
    this.immigrationService.scanProfileDocument(file).subscribe({
      next: result => {
        this.scanLoading = false;
        if (result.docTypeDetected !== 'PASSPORT' && result.docTypeDetected !== 'US_VISA_STAMP') {
          this.scanError = `Detected ${result.docTypeDetected} — upload a passport or visa stamp here.`;
          return;
        }
        this.scanResult = result;
        this.scanApplySelections = {};
        for (const key of Object.keys(result.extractedFields)) {
          this.scanApplySelections[key] = !result.extractedFields[key].needsReview;
        }
      },
      error: err => {
        this.scanLoading = false;
        this.scanError = err?.error?.message || err?.error?.error || 'Scan failed';
      }
    });
  }

  scanFieldKeys(): string[] {
    return this.scanResult ? Object.keys(this.scanResult.extractedFields) : [];
  }

  scanFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      lastName: 'Last Name', firstName: 'First Name', middleName: 'Middle Name',
      dateOfBirth: 'Date of Birth', nationality: 'Nationality', gender: 'Gender',
      passportNumber: 'Passport Number', issuingCountry: 'Issuing Country',
      issueDate: 'Issue Date', expiryDate: 'Expiry Date', placeOfBirth: 'Place of Birth',
      visaType: 'Visa Type',
    };
    return labels[key] || key;
  }

  isSensitiveScanField(key: string): boolean {
    return key === 'passportNumber';
  }

  maskScanValue(value: string): string {
    if (value.length <= 3) return '***';
    return '***' + value.slice(-3);
  }

  confidencePercent(conf: number): number {
    return Math.round(conf * 100);
  }

  applyScanToQuestionnaire(): void {
    if (!this.scanResult) return;
    const f = this.scanResult.extractedFields;

    // Map scanned fields to canonical question keys used in questionnaires
    const mapping: Record<string, string[]> = {
      lastName:       ['beneficiary_last_name', 'last_name'],
      firstName:      ['beneficiary_first_name', 'first_name'],
      middleName:     ['beneficiary_middle_name', 'middle_name'],
      dateOfBirth:    ['beneficiary_dob', 'date_of_birth'],
      passportNumber: ['passport_number', 'beneficiary_passport_number'],
      issuingCountry: ['passport_country', 'country_of_citizenship'],
      issueDate:      ['passport_issue_date'],
      expiryDate:     ['passport_expiry_date', 'visa_expiry_date'],
      nationality:    ['country_of_citizenship', 'nationality'],
      gender:         ['gender'],
    };

    for (const [scanKey, questionKeys] of Object.entries(mapping)) {
      if (!this.scanApplySelections[scanKey] || !f[scanKey]) continue;
      for (const qKey of questionKeys) {
        if (this.answers[qKey] !== undefined || this.hasQuestionKey(qKey)) {
          this.answers[qKey] = f[scanKey].value;
          this.verified[qKey] = false;
          break;
        }
      }
    }

    this.scanResult = null;
    this.scanApplySelections = {};
  }

  private hasQuestionKey(key: string): boolean {
    if (!this.spec) return false;
    return this.spec.sections.some(s => s.questions.some(q => q.key === key));
  }

  isPassportSection(section: QuestionnaireSection): boolean {
    const passportKeys = ['passport_number', 'beneficiary_passport_number',
                          'last_name', 'beneficiary_last_name', 'first_name'];
    return section.questions.some(q => passportKeys.includes(q.key));
  }

  dismissScan(): void {
    this.scanResult = null;
    this.scanError = null;
    this.scanApplySelections = {};
  }
}
