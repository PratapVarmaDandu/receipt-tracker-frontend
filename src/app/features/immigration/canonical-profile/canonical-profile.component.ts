import { Component, OnInit } from '@angular/core';
import {
  ImmigrationService, CanonicalProfile, Address,
  PassportEntry, TravelEntry, Education, Employment, Dependent, PriorVisa
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
  sharePanel: { section: string; email: string; expiry: number; sharing: boolean; shareUrl: string | null } | null = null;
  shareError: string | null = null;

  constructor(
    private immigrationService: ImmigrationService,
    private documentService: DocumentService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.load();
    this.loadVaultDocs();
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
  openShare(section: string): void {
    this.sharePanel = { section, email: '', expiry: 30, sharing: false, shareUrl: null };
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
