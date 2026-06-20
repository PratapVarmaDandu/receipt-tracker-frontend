import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ImmigrationService, ImmigrationCase, CanonicalProfile, Address,
  PassportEntry, TravelEntry, Education, Employment, Dependent, PriorVisa,
  ScanResult, FieldExtraction
} from '../../../services/immigration.service';
import { DocumentService } from '../../../services/document.service';
import { DocFile, CreateDocumentShareRequest } from '../../../models/document.model';
import { LoggerService } from '../../../services/logger.service';

type TabId = 'bio' | 'passport' | 'entry' | 'history' | 'dependents';

interface ProfileForm {
  legalFirstName: string; legalLastName: string; middleName: string;
  dateOfBirth: string; countryOfBirth: string; citizenshipCountry: string; gender: string;
  phone: string; notes: string;
  currentVisaType: string; currentVisaExpiry: string;
  currentAddress: Address;
  passports: PassportEntry[];
  travelEntries: TravelEntry[];
  education: Education[];
  employment: Employment[];
  dependents: Dependent[];
  priorVisas: PriorVisa[];
}

@Component({
  selector: 'app-canonical-profile',
  templateUrl: './canonical-profile.component.html',
  styleUrls: ['./canonical-profile.component.scss']
})
export class CanonicalProfileComponent implements OnInit {
  private readonly source = 'CanonicalProfileComponent';

  profile: CanonicalProfile | null = null;
  loading = true;
  saving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  savedOk = false;

  activeTab: TabId = 'bio';
  readonly tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'bio',        label: 'Personal Info',     icon: 'bi-person' },
    { id: 'passport',   label: 'Passport',           icon: 'bi-passport' },
    { id: 'entry',      label: 'US Entry & Status',  icon: 'bi-airplane-engines' },
    { id: 'history',    label: 'Education & Work',   icon: 'bi-briefcase' },
    { id: 'dependents', label: 'Dependents & Visas', icon: 'bi-people' },
  ];

  form: ProfileForm = this.blankForm();

  // ── Vault doc picker ───────────────────────────────────────────────────────
  vaultDocs: DocFile[] = [];
  vaultDocsLoading = false;
  expandedPicker: string | null = null;
  selectedDocId: Record<string, number | null> = {};

  // ── Share panel ────────────────────────────────────────────────────────────
  sharePanel: { section: string; email: string; emailReadonly: boolean; expiry: number; sharing: boolean; shareUrl: string | null } | null = null;
  shareError: string | null = null;

  // ── Case context (populated when navigated from a case, for auto-fill) ────
  caseContext: ImmigrationCase | null = null;

  // ── Document Scan ─────────────────────────────────────────────────────────
  scanLoading = false;
  scanError: string | null = null;
  scanResult: ScanResult | null = null;
  scanApplySelections: Record<string, boolean> = {};
  scanPassportIndex = 0;   // which passport entry to apply scanned data to
  scanTravelIndex = 0;     // which travel entry to apply I-94 data to

  constructor(
    private immigrationService: ImmigrationService,
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.load();
    this.loadVaultDocs();
    const caseId = this.route.snapshot.queryParamMap.get('caseId');
    if (caseId) {
      this.immigrationService.getCase(Number(caseId)).subscribe({
        next: c => { this.caseContext = c; },
        error: () => {}
      });
    }
  }

  load(): void {
    this.loading = true;
    this.immigrationService.getMyProfile().subscribe({
      next: p => { this.profile = p; this.resetForm(p); this.loading = false; },
      error: err => {
        this.loadError = err?.error?.error || 'Failed to load profile';
        this.loading = false;
        this.logger.error(this.source, 'load failed', err);
      }
    });
  }

  setTab(id: TabId): void { this.activeTab = id; }

  save(): void {
    const errors = this.validateDates();
    if (errors.length) {
      this.saveError = errors.join(' | ');
      return;
    }
    this.saving = true;
    this.saveError = null;
    this.savedOk = false;
    this.immigrationService.updateMyProfile(this.form as any).subscribe({
      next: updated => {
        this.profile = updated;
        this.resetForm(updated);
        this.saving = false;
        this.savedOk = true;
        setTimeout(() => this.savedOk = false, 3000);
        this.logger.info(this.source, 'Profile saved');
      },
      error: err => {
        this.saveError = err?.error?.error || 'Save failed';
        this.saving = false;
        this.logger.error(this.source, 'save failed', err);
      }
    });
  }

  loadVaultDocs(): void {
    this.vaultDocsLoading = true;
    this.documentService.list().subscribe({
      next: docs => { this.vaultDocs = docs; this.vaultDocsLoading = false; },
      error: () => { this.vaultDocsLoading = false; }
    });
  }

  // ── Passport ───────────────────────────────────────────────────────────────
  addPassport(): void {
    this.form.passports.push({ id: this.newId(), documentIds: [] });
  }
  removePassport(i: number): void { this.form.passports.splice(i, 1); }

  isCurrentPassport(p: PassportEntry): boolean {
    const withDates = this.form.passports.filter(x => x.issueDate);
    if (!withDates.length) return this.form.passports[0] === p;
    const latest = [...withDates].sort((a, b) =>
      (b.issueDate || '').localeCompare(a.issueDate || '')
    )[0];
    return latest === p;
  }

  // ── Travel entries ─────────────────────────────────────────────────────────
  addTravelEntry(): void { this.form.travelEntries.push({ id: this.newId(), documentIds: [] }); }
  removeTravelEntry(i: number): void { this.form.travelEntries.splice(i, 1); }

  // ── Education / employment / dependents / prior visas ─────────────────────
  addEducation(): void  { this.form.education.push({ documentIds: [] }); }
  removeEducation(i: number): void { this.form.education.splice(i, 1); }

  addEmployment(): void  { this.form.employment.push({ documentIds: [] }); }
  removeEmployment(i: number): void { this.form.employment.splice(i, 1); }

  addDependent(): void  { this.form.dependents.push({ documentIds: [] }); }
  removeDependent(i: number): void { this.form.dependents.splice(i, 1); }

  addPriorVisa(): void  { this.form.priorVisas.push({ documentIds: [] }); }
  removePriorVisa(i: number): void { this.form.priorVisas.splice(i, 1); }

  // ── Doc vault attachment ──────────────────────────────────────────────────
  pickerKey(section: string, index: number): string { return `${section}-${index}`; }

  togglePicker(section: string, index: number): void {
    const key = this.pickerKey(section, index);
    this.expandedPicker = this.expandedPicker === key ? null : key;
  }

  attachDoc(section: string, index: number): void {
    const key = this.pickerKey(section, index);
    const docId = this.selectedDocId[key];
    if (!docId) return;
    const item = this.sectionItems(section)[index];
    if (!item.documentIds) item.documentIds = [];
    if (!item.documentIds.includes(docId)) item.documentIds.push(docId);
    this.selectedDocId[key] = null;
    this.expandedPicker = null;
  }

  removeDoc(section: string, index: number, docId: number): void {
    const item = this.sectionItems(section)[index];
    if (item.documentIds) item.documentIds = item.documentIds.filter((id: number) => id !== docId);
  }

  docTitle(id: number): string {
    return this.vaultDocs.find(d => d.id === id)?.title || `Doc #${id}`;
  }

  availableDocs(section: string, index: number): DocFile[] {
    const item = this.sectionItems(section)[index];
    const attached: number[] = item.documentIds || [];
    return this.vaultDocs.filter(d => !attached.includes(d.id));
  }

  private sectionItems(section: string): any[] {
    switch (section) {
      case 'passport':   return this.form.passports;
      case 'travel':     return this.form.travelEntries;
      case 'education':  return this.form.education;
      case 'employment': return this.form.employment;
      case 'dependent':  return this.form.dependents;
      case 'priorVisa':  return this.form.priorVisas;
      default:           return [];
    }
  }

  // ── Share section ─────────────────────────────────────────────────────────
  openShare(section: string, recipient: 'attorney' | 'employer'): void {
    let email = '';
    let emailReadonly = false;
    if (this.caseContext) {
      if (recipient === 'attorney' && this.caseContext.assignedAttorneyEmail) {
        email = this.caseContext.assignedAttorneyEmail;
        emailReadonly = true;
      } else if (recipient === 'employer' && this.caseContext.beneficiaryEmail) {
        // Use employer org name as hint; employer contact email not in DTO — leave editable
        email = '';
        emailReadonly = false;
      }
    }
    this.sharePanel = { section, email, emailReadonly, expiry: 30, sharing: false, shareUrl: null };
    this.shareError = null;
  }
  closeShare(): void { this.sharePanel = null; this.shareError = null; }

  submitShare(): void {
    if (!this.sharePanel || !this.sharePanel.email.trim()) return;
    const docIds = this.getSectionDocIds(this.sharePanel.section);
    if (!docIds.length) {
      this.shareError = 'Attach at least one document from the vault before sharing.';
      return;
    }
    this.sharePanel.sharing = true;
    this.shareError = null;
    const sectionLabel = this.shareSectionLabel(this.sharePanel.section);
    const req: CreateDocumentShareRequest = {
      documentIds: docIds,
      recipientEmail: this.sharePanel.email.trim(),
      purpose: `Immigration profile — ${sectionLabel}`,
      expiryDays: this.sharePanel.expiry
    };
    this.documentService.createShare(req).subscribe({
      next: share => {
        this.sharePanel!.sharing = false;
        this.sharePanel!.shareUrl = `${window.location.origin}/documents/shared/${share.shareToken}`;
      },
      error: err => {
        this.sharePanel!.sharing = false;
        this.shareError = err?.error?.error || 'Share failed';
        this.logger.error(this.source, 'submitShare failed', err);
      }
    });
  }

  copyShareUrl(): void {
    if (this.sharePanel?.shareUrl) {
      navigator.clipboard.writeText(this.sharePanel.shareUrl);
    }
  }

  private getSectionDocIds(section: string): number[] {
    const items = this.sectionItems(section);
    const ids: number[] = [];
    for (const item of items) {
      if (item.documentIds) ids.push(...item.documentIds);
    }
    return [...new Set(ids)];
  }

  private shareSectionLabel(section: string): string {
    const map: Record<string, string> = {
      passport: 'Passport', travel: 'US Entry & Travel',
      education: 'Education', employment: 'Employment',
      dependent: 'Dependents', priorVisa: 'Prior Visas',
    };
    return map[section] || section;
  }

  // ── Document Scan methods ─────────────────────────────────────────────────
  triggerScanFile(input: HTMLInputElement): void { input.click(); }

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
        this.scanResult = result;
        this.scanApplySelections = {};
        for (const key of Object.keys(result.extractedFields)) {
          this.scanApplySelections[key] = !result.extractedFields[key].needsReview;
        }
      },
      error: err => {
        this.scanLoading = false;
        this.scanError = err?.error?.message || err?.error?.error || 'Scan failed';
        this.logger.error(this.source, 'scan failed', err);
      }
    });
  }

  scanFieldKeys(): string[] {
    return this.scanResult ? Object.keys(this.scanResult.extractedFields) : [];
  }

  scanFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      lastName: 'Last Name', firstName: 'First Name', middleName: 'Middle Name',
      nationality: 'Nationality', dateOfBirth: 'Date of Birth', gender: 'Gender',
      passportNumber: 'Passport Number', issuingCountry: 'Issuing Country',
      issueDate: 'Issue Date', expiryDate: 'Expiry Date', placeOfBirth: 'Place of Birth',
      i94Number: 'I-94 Number', countryOfCitizenship: 'Country of Citizenship',
      portOfEntry: 'Port of Entry', entryDate: 'Entry Date', admittedUntil: 'Admitted Until',
      visaClass: 'Visa Class', travelDocumentNumber: 'Travel Document Number',
      receiptNumber: 'Receipt Number', noticeType: 'Notice Type',
      beneficiaryName: 'Beneficiary Name', petitionerName: 'Petitioner Name',
      classOfAdmission: 'Class of Admission', validFrom: 'Valid From', validThrough: 'Valid Through',
      priorityDate: 'Priority Date', visaType: 'Visa Type', issuingPost: 'Issuing Post',
      entries: 'Entries Allowed', controlNumber: 'Control Number',
      sevisId: 'SEVIS ID', schoolName: 'School Name', programStartDate: 'Program Start',
      programEndDate: 'Program End', educationLevel: 'Education Level', fieldOfStudy: 'Field of Study',
      countryOfBirth: 'Country of Birth', uscisNumber: 'USCIS Number',
      cardExpiryDate: 'Card Expiry Date', categoryCode: 'Category Code', cardNumber: 'Card Number',
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

  applyScanToProfile(): void {
    if (!this.scanResult) return;
    const f = this.scanResult.extractedFields;
    const dt = this.scanResult.docTypeDetected;

    if (dt === 'PASSPORT') {
      if (f['lastName'] && this.scanApplySelections['lastName'])
        this.form.legalLastName = f['lastName'].value;
      if (f['firstName'] && this.scanApplySelections['firstName'])
        this.form.legalFirstName = f['firstName'].value;
      if (f['middleName'] && this.scanApplySelections['middleName'])
        this.form.middleName = f['middleName'].value;
      if (f['dateOfBirth'] && this.scanApplySelections['dateOfBirth'])
        this.form.dateOfBirth = f['dateOfBirth'].value;
      if (f['placeOfBirth'] && this.scanApplySelections['placeOfBirth'])
        this.form.countryOfBirth = f['placeOfBirth'].value;
      if (f['nationality'] && this.scanApplySelections['nationality'])
        this.form.citizenshipCountry = f['nationality'].value;
      if (f['gender'] && this.scanApplySelections['gender'])
        this.form.gender = f['gender'].value;

      // Apply passport-specific fields to the selected passport entry
      const idx = this.scanPassportIndex;
      if (idx >= 0 && idx < this.form.passports.length) {
        const p = this.form.passports[idx];
        if (f['passportNumber'] && this.scanApplySelections['passportNumber'])
          p.number = f['passportNumber'].value;
        if (f['issuingCountry'] && this.scanApplySelections['issuingCountry'])
          p.country = f['issuingCountry'].value;
        if (f['issueDate'] && this.scanApplySelections['issueDate'])
          p.issueDate = f['issueDate'].value;
        if (f['expiryDate'] && this.scanApplySelections['expiryDate'])
          p.expiryDate = f['expiryDate'].value;
      }
    } else if (dt === 'I94_PRINTOUT') {
      if (f['lastName'] && this.scanApplySelections['lastName'])
        this.form.legalLastName = f['lastName'].value;
      if (f['firstName'] && this.scanApplySelections['firstName'])
        this.form.legalFirstName = f['firstName'].value;
      if (f['dateOfBirth'] && this.scanApplySelections['dateOfBirth'])
        this.form.dateOfBirth = f['dateOfBirth'].value;
      if (f['countryOfCitizenship'] && this.scanApplySelections['countryOfCitizenship'])
        this.form.citizenshipCountry = f['countryOfCitizenship'].value;
      if (f['visaClass'] && this.scanApplySelections['visaClass'])
        this.form.currentVisaType = f['visaClass'].value;

      // Apply to travel entry
      const idx = this.scanTravelIndex;
      if (idx >= 0 && idx < this.form.travelEntries.length) {
        const t = this.form.travelEntries[idx];
        if (f['i94Number'] && this.scanApplySelections['i94Number'])
          t.i94Number = f['i94Number'].value;
        if (f['portOfEntry'] && this.scanApplySelections['portOfEntry'])
          t.portOfEntry = f['portOfEntry'].value;
        if (f['entryDate'] && this.scanApplySelections['entryDate'])
          t.entryDate = f['entryDate'].value;
        if (f['admittedUntil'] && this.scanApplySelections['admittedUntil'])
          t.admittedUntil = f['admittedUntil'].value;
        if (f['visaClass'] && this.scanApplySelections['visaClass'])
          t.visaClass = f['visaClass'].value;
      }
    } else if (dt === 'US_VISA_STAMP') {
      if (f['lastName'] && this.scanApplySelections['lastName'])
        this.form.legalLastName = f['lastName'].value;
      if (f['firstName'] && this.scanApplySelections['firstName'])
        this.form.legalFirstName = f['firstName'].value;
      if (f['dateOfBirth'] && this.scanApplySelections['dateOfBirth'])
        this.form.dateOfBirth = f['dateOfBirth'].value;
      if (f['nationality'] && this.scanApplySelections['nationality'])
        this.form.citizenshipCountry = f['nationality'].value;
      if (f['visaType'] && this.scanApplySelections['visaType'])
        this.form.currentVisaType = f['visaType'].value;
      if (f['expiryDate'] && this.scanApplySelections['expiryDate'])
        this.form.currentVisaExpiry = f['expiryDate'].value;
    }

    this.scanResult = null;
    this.scanApplySelections = {};
  }

  dismissScan(): void {
    this.scanResult = null;
    this.scanError = null;
    this.scanApplySelections = {};
  }

  confidencePercent(conf: number): number {
    return Math.round(conf * 100);
  }

  // ── Validation ────────────────────────────────────────────────────────────
  private isValidDate(v: string | undefined): boolean {
    if (!v || !v.trim()) return true; // empty is ok — field is optional
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
  }

  private validateDates(): string[] {
    const errs: string[] = [];
    if (!this.isValidDate(this.form.dateOfBirth))
      errs.push('Date of Birth must be YYYY-MM-DD');
    if (!this.isValidDate(this.form.currentVisaExpiry))
      errs.push('Visa Expiry must be YYYY-MM-DD');
    this.form.passports.forEach((p, i) => {
      if (!this.isValidDate(p.issueDate))
        errs.push(`Passport #${i + 1} Issue Date must be YYYY-MM-DD`);
      if (!this.isValidDate(p.expiryDate))
        errs.push(`Passport #${i + 1} Expiry Date must be YYYY-MM-DD`);
    });
    this.form.travelEntries.forEach((t, i) => {
      if (!this.isValidDate(t.entryDate))
        errs.push(`US Entry #${i + 1} Entry Date must be YYYY-MM-DD`);
      if (!this.isValidDate(t.admittedUntil))
        errs.push(`US Entry #${i + 1} Admitted Until must be YYYY-MM-DD`);
    });
    this.form.dependents.forEach((d, i) => {
      if (!this.isValidDate(d.dateOfBirth))
        errs.push(`Dependent #${i + 1} Date of Birth must be YYYY-MM-DD`);
    });
    this.form.priorVisas.forEach((v, i) => {
      if (!this.isValidDate(v.issueDate))
        errs.push(`Prior Visa #${i + 1} Issue Date must be YYYY-MM-DD`);
      if (!this.isValidDate(v.expiryDate))
        errs.push(`Prior Visa #${i + 1} Expiry Date must be YYYY-MM-DD`);
    });
    return errs;
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private newId(): string {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  }

  private resetForm(p: CanonicalProfile): void {
    this.form = {
      legalFirstName:     p.legalFirstName     ?? '',
      legalLastName:      p.legalLastName      ?? '',
      middleName:         p.middleName         ?? '',
      dateOfBirth:        p.dateOfBirth        ?? '',
      countryOfBirth:     p.countryOfBirth     ?? '',
      citizenshipCountry: p.citizenshipCountry ?? '',
      gender:             p.gender             ?? '',
      phone:              p.phone              ?? '',
      notes:              p.notes              ?? '',
      currentVisaType:    p.currentVisaType    ?? '',
      currentVisaExpiry:  p.currentVisaExpiry  ?? '',
      currentAddress:     { ...(p.currentAddress ?? {}) },
      passports:     (p.passports    ?? []).map(e => ({ ...e, documentIds: [...(e.documentIds ?? [])] })),
      travelEntries: (p.travelEntries ?? []).map(e => ({ ...e, documentIds: [...(e.documentIds ?? [])] })),
      education:     (p.education    ?? []).map(e => ({ ...e, documentIds: [...(e.documentIds ?? [])] })),
      employment:    (p.employment   ?? []).map(e => ({ ...e, documentIds: [...(e.documentIds ?? [])] })),
      dependents:    (p.dependents   ?? []).map(d => ({ ...d, documentIds: [...(d.documentIds ?? [])] })),
      priorVisas:    (p.priorVisas   ?? []).map(v => ({ ...v, documentIds: [...(v.documentIds ?? [])] })),
    };
  }

  private blankForm(): ProfileForm {
    return {
      legalFirstName: '', legalLastName: '', middleName: '',
      dateOfBirth: '', countryOfBirth: '', citizenshipCountry: '', gender: '',
      phone: '', notes: '', currentVisaType: '', currentVisaExpiry: '',
      currentAddress: {},
      passports: [], travelEntries: [],
      education: [], employment: [], dependents: [], priorVisas: [],
    };
  }
}
