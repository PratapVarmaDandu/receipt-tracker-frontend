import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Vehicle, MaintenanceRecord, FuelRecord, MaintenanceScheduleItem, Recall,
  VehicleAccess,
  MAINTENANCE_TYPE_LABELS, FUEL_TYPE_LABELS, MaintenanceType, FuelType
} from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { ReceiptService } from '../../services/receipt.service';
import { Receipt } from '../../models/receipt.model';

interface VehicleEditForm {
  trim: string;
  vin: string;
  color: string;
  licensePlate: string;
  registrationState: string;
  tagExpirationDate: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  purchaseDate: string;
  purchasePrice: number | null;
  purchasedFromDealer: boolean;
  dealerName: string;
  currentMileage: number | null;
  notes: string;
}

interface MaintenanceForm {
  maintenanceType: MaintenanceType;
  serviceDate: string;
  mileage: number | null;
  cost: number | null;
  provider: string;
  notes: string;
}

interface FuelForm {
  fillDate: string;
  odometer: number | null;
  gallons: number | null;
  pricePerGallon: number | null;
  fuelType: FuelType;
  fullTank: boolean;
  stationName: string;
  notes: string;
}

@Component({
  selector: 'app-vehicle-detail',
  templateUrl: './vehicle-detail.component.html',
  styleUrls: ['./vehicle-detail.component.scss']
})
export class VehicleDetailComponent implements OnInit {
  vehicle: Vehicle | null = null;
  maintenance: MaintenanceRecord[] = [];
  fuel: FuelRecord[] = [];
  schedule: MaintenanceScheduleItem[] = [];
  recalls: Recall[] = [];
  linkedReceipts: any[] = [];
  loading = true;

  // ── Add receipt to vehicle ─────────────────────────────────────────────────
  showAddReceipt = false;
  allReceipts: Receipt[] = [];
  allReceiptsLoading = false;
  addReceiptId: number | null = null;
  addReceiptCategory: string | null = null;
  addingReceipt = false;
  addReceiptError: string | null = null;

  readonly vehicleCategories = [
    { value: 'FUEL',         label: 'Fuel / Gas' },
    { value: 'MAINTENANCE',  label: 'Maintenance' },
    { value: 'REPAIR',       label: 'Repair' },
    { value: 'INSURANCE',    label: 'Insurance' },
    { value: 'REGISTRATION', label: 'Registration / Tags' },
    { value: 'PARKING',      label: 'Parking / Tolls' },
    { value: 'WASH',         label: 'Car Wash' },
    { value: 'OTHER',        label: 'Other' },
  ];
  tab: 'overview' | 'maintenance' | 'fuel' | 'schedule' | 'recalls' | 'sharing' | 'receipts' = 'overview';

  // ── Sharing ────────────────────────────────────────────────────────────────
  inviteEmail = '';
  inviting = false;
  inviteError: string | null = null;
  inviteSuccess: string | null = null;
  revoking: number | null = null;

  // ── Vehicle edit form ──────────────────────────────────────────────────────
  editingDetails = false;
  savingDetails = false;
  detailsError: string | null = null;
  detailsForm: VehicleEditForm = this.emptyDetailsForm();

  readonly MAINTENANCE_TYPE_LABELS = MAINTENANCE_TYPE_LABELS;
  readonly FUEL_TYPE_LABELS = FUEL_TYPE_LABELS;
  readonly maintenanceTypes = Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[];
  readonly fuelTypes = Object.keys(FUEL_TYPE_LABELS) as FuelType[];

  // ── Maintenance form ───────────────────────────────────────────────────────
  showMaintForm = false;
  savingMaint = false;
  maintError: string | null = null;
  editingMaintId: number | null = null;
  receiptFile: File | null = null;
  maintForm: MaintenanceForm = this.emptyMaintForm();

  // ── Fuel form ──────────────────────────────────────────────────────────────
  showFuelForm = false;
  savingFuel = false;
  fuelError: string | null = null;
  editingFuelId: number | null = null;
  fuelForm: FuelForm = this.emptyFuelForm();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    private receiptService: ReceiptService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.vehicleService.getById(id).subscribe({
      next: v => {
        this.vehicle = v;
        this.vehicleService.getMaintenance(id).subscribe(m => { this.maintenance = m; });
        this.vehicleService.getFuel(id).subscribe(f => { this.fuel = f; });
        this.vehicleService.getSchedule(id).subscribe(s => { this.schedule = s; });
        this.vehicleService.getRecalls(id).subscribe(r => { this.recalls = r; this.loading = false; });
        this.vehicleService.getVehicleReceipts(id).subscribe(rs => { this.linkedReceipts = rs; });
      },
      error: () => { this.loading = false; this.router.navigate(['/garage']); }
    });
  }

  // ── Add receipt helpers ────────────────────────────────────────────────────

  openAddReceipt(): void {
    this.showAddReceipt = true;
    this.addReceiptId = null;
    this.addReceiptCategory = null;
    this.addReceiptError = null;
    if (this.allReceipts.length === 0) {
      this.allReceiptsLoading = true;
      this.receiptService.getAll().subscribe(rs => {
        this.allReceipts = rs;
        this.allReceiptsLoading = false;
      });
    }
  }

  get unlinkedReceipts(): Receipt[] {
    const alreadyLinked = new Set(this.linkedReceipts.map((r: any) => r.id));
    return this.allReceipts.filter(r => !alreadyLinked.has(r.id));
  }

  onAddReceiptSelected(receiptId: number | null): void {
    this.addReceiptId = receiptId;
    if (receiptId) {
      const r = this.allReceipts.find(x => x.id === receiptId);
      this.addReceiptCategory = r?.storeType === 'GAS_STATION' ? 'FUEL' : null;
    } else {
      this.addReceiptCategory = null;
    }
  }

  addReceiptToVehicle(): void {
    if (!this.addReceiptId || !this.vehicle) return;
    this.addingReceipt = true;
    this.addReceiptError = null;
    this.receiptService.linkToVehicle(this.addReceiptId, this.vehicle.id, this.addReceiptCategory).subscribe({
      next: () => {
        this.showAddReceipt = false;
        this.addReceiptId = null;
        this.addReceiptCategory = null;
        this.vehicleService.getVehicleReceipts(this.vehicle!.id).subscribe(rs => { this.linkedReceipts = rs; });
        this.addingReceipt = false;
      },
      error: err => {
        this.addReceiptError = err?.error?.error ?? 'Failed to link receipt.';
        this.addingReceipt = false;
      }
    });
  }

  // ── Vehicle details edit ──────────────────────────────────────────────────
  emptyDetailsForm(): VehicleEditForm {
    return {
      trim: '', vin: '', color: '', licensePlate: '', registrationState: '',
      tagExpirationDate: '', insuranceProvider: '', insurancePolicyNumber: '',
      insuranceExpiryDate: '', purchaseDate: '', purchasePrice: null,
      purchasedFromDealer: false, dealerName: '', currentMileage: null, notes: ''
    };
  }

  openEditDetails(): void {
    if (!this.vehicle) return;
    this.detailsForm = {
      trim: this.vehicle.trim ?? '',
      vin: this.vehicle.vin ?? '',
      color: this.vehicle.color ?? '',
      licensePlate: this.vehicle.licensePlate ?? '',
      registrationState: this.vehicle.registrationState ?? '',
      tagExpirationDate: this.vehicle.tagExpirationDate ?? '',
      insuranceProvider: this.vehicle.insuranceProvider ?? '',
      insurancePolicyNumber: this.vehicle.insurancePolicyNumber ?? '',
      insuranceExpiryDate: this.vehicle.insuranceExpiryDate ?? '',
      purchaseDate: this.vehicle.purchaseDate ?? '',
      purchasePrice: this.vehicle.purchasePrice ?? null,
      purchasedFromDealer: this.vehicle.purchasedFromDealer ?? false,
      dealerName: this.vehicle.dealerName ?? '',
      currentMileage: this.vehicle.currentMileage ?? null,
      notes: this.vehicle.notes ?? ''
    };
    this.detailsError = null;
    this.editingDetails = true;
  }

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.detailsError = null;
  }

  saveDetails(): void {
    if (!this.vehicle) return;
    this.savingDetails = true;
    this.detailsError = null;
    const payload: Partial<Vehicle> = {
      make: this.vehicle.make,
      model: this.vehicle.model,
      modelYear: this.vehicle.modelYear,
      trim: this.detailsForm.trim || undefined,
      vin: this.detailsForm.vin || undefined,
      color: this.detailsForm.color || undefined,
      licensePlate: this.detailsForm.licensePlate || undefined,
      registrationState: this.detailsForm.registrationState || undefined,
      tagExpirationDate: this.detailsForm.tagExpirationDate || undefined,
      insuranceProvider: this.detailsForm.insuranceProvider || undefined,
      insurancePolicyNumber: this.detailsForm.insurancePolicyNumber || undefined,
      insuranceExpiryDate: this.detailsForm.insuranceExpiryDate || undefined,
      purchaseDate: this.detailsForm.purchaseDate || undefined,
      purchasePrice: this.detailsForm.purchasePrice ?? undefined,
      purchasedFromDealer: this.detailsForm.purchasedFromDealer,
      dealerName: this.detailsForm.dealerName || undefined,
      currentMileage: this.detailsForm.currentMileage ?? undefined,
      notes: this.detailsForm.notes || undefined
    };
    this.vehicleService.update(this.vehicle.id, payload).subscribe({
      next: (v) => {
        this.vehicle = v;
        this.savingDetails = false;
        this.editingDetails = false;
      },
      error: (err) => {
        this.detailsError = err?.error?.error ?? 'Failed to save. Please try again.';
        this.savingDetails = false;
      }
    });
  }

  // ── Edit window: 30 days from creation ───────────────────────────────────
  canEdit(createdAt: string | undefined): boolean {
    if (!createdAt) return false;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs <= 30 * 24 * 60 * 60 * 1000;
  }

  // ── Maintenance ───────────────────────────────────────────────────────────
  emptyMaintForm(): MaintenanceForm {
    return {
      maintenanceType: 'OIL_CHANGE',
      serviceDate: new Date().toISOString().split('T')[0],
      mileage: null,
      cost: null,
      provider: '',
      notes: ''
    };
  }

  openAddMaint(): void {
    this.editingMaintId = null;
    this.maintForm = this.emptyMaintForm();
    this.receiptFile = null;
    this.maintError = null;
    this.showMaintForm = true;
  }

  openEditMaint(m: MaintenanceRecord): void {
    this.editingMaintId = m.id;
    this.maintForm = {
      maintenanceType: m.maintenanceType,
      serviceDate: m.serviceDate,
      mileage: m.mileage ?? null,
      cost: m.cost != null ? Number(m.cost) : null,
      provider: m.provider ?? '',
      notes: m.notes ?? ''
    };
    this.receiptFile = null;
    this.maintError = null;
    this.showMaintForm = true;
  }

  cancelMaint(): void {
    this.showMaintForm = false;
    this.editingMaintId = null;
    this.maintForm = this.emptyMaintForm();
    this.receiptFile = null;
    this.maintError = null;
  }

  onReceiptFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.receiptFile = file;
  }

  saveMaint(): void {
    if (!this.vehicle) return;
    if (!this.maintForm.serviceDate) {
      this.maintError = 'Service date is required.';
      return;
    }
    this.savingMaint = true;
    this.maintError = null;

    const record: Partial<MaintenanceRecord> = {
      maintenanceType: this.maintForm.maintenanceType,
      serviceDate: this.maintForm.serviceDate,
      mileage: this.maintForm.mileage ?? undefined,
      cost: this.maintForm.cost ?? undefined,
      provider: this.maintForm.provider || undefined,
      notes: this.maintForm.notes || undefined
    };

    const req$ = this.editingMaintId != null
      ? this.vehicleService.updateMaintenance(this.vehicle.id, this.editingMaintId, record, this.receiptFile ?? undefined)
      : this.vehicleService.addMaintenance(this.vehicle.id, record, this.receiptFile ?? undefined);

    req$.subscribe({
      next: saved => {
        this.savingMaint = false;
        if (this.editingMaintId != null) {
          this.maintenance = this.maintenance.map(m => m.id === saved.id ? saved : m);
        } else {
          this.maintenance.unshift(saved);
        }
        this.cancelMaint();
      },
      error: err => {
        this.savingMaint = false;
        this.maintError = err?.error?.error ?? 'Failed to save. Please try again.';
      }
    });
  }

  deleteMaintenance(recordId: number): void {
    if (!this.vehicle || !confirm('Delete this maintenance record?')) return;
    this.vehicleService.deleteMaintenance(this.vehicle.id, recordId).subscribe({
      next: () => { this.maintenance = this.maintenance.filter(m => m.id !== recordId); }
    });
  }

  // ── Fuel ──────────────────────────────────────────────────────────────────
  emptyFuelForm(): FuelForm {
    return {
      fillDate: new Date().toISOString().split('T')[0],
      odometer: null,
      gallons: null,
      pricePerGallon: null,
      fuelType: 'REGULAR',
      fullTank: true,
      stationName: '',
      notes: ''
    };
  }

  get computedTotalCost(): number | null {
    const g = this.fuelForm.gallons;
    const p = this.fuelForm.pricePerGallon;
    return (g != null && p != null) ? Math.round(g * p * 100) / 100 : null;
  }

  openAddFuel(): void {
    this.editingFuelId = null;
    this.fuelForm = this.emptyFuelForm();
    this.fuelError = null;
    this.showFuelForm = true;
  }

  openEditFuel(f: FuelRecord): void {
    this.editingFuelId = f.id;
    this.fuelForm = {
      fillDate: f.fillDate,
      odometer: f.odometer,
      gallons: f.gallons != null ? Number(f.gallons) : null,
      pricePerGallon: f.pricePerGallon != null ? Number(f.pricePerGallon) : null,
      fuelType: f.fuelType,
      fullTank: f.fullTank,
      stationName: f.stationName ?? '',
      notes: f.notes ?? ''
    };
    this.fuelError = null;
    this.showFuelForm = true;
  }

  cancelFuel(): void {
    this.showFuelForm = false;
    this.editingFuelId = null;
    this.fuelForm = this.emptyFuelForm();
    this.fuelError = null;
  }

  saveFuel(): void {
    if (!this.vehicle) return;
    if (!this.fuelForm.odometer || !this.fuelForm.gallons || !this.fuelForm.fillDate) {
      this.fuelError = 'Date, odometer, and gallons are required.';
      return;
    }
    this.savingFuel = true;
    this.fuelError = null;

    const record: Partial<FuelRecord> = {
      fillDate: this.fuelForm.fillDate,
      odometer: this.fuelForm.odometer,
      gallons: this.fuelForm.gallons,
      pricePerGallon: this.fuelForm.pricePerGallon ?? undefined,
      totalCost: this.computedTotalCost ?? undefined,
      fuelType: this.fuelForm.fuelType,
      fullTank: this.fuelForm.fullTank,
      stationName: this.fuelForm.stationName || undefined,
      notes: this.fuelForm.notes || undefined
    };

    const req$ = this.editingFuelId != null
      ? this.vehicleService.updateFuel(this.vehicle.id, this.editingFuelId, record)
      : this.vehicleService.addFuel(this.vehicle.id, record);

    req$.subscribe({
      next: () => {
        this.savingFuel = false;
        this.cancelFuel();
        // Refresh list so MPG is recomputed for all rows
        this.vehicleService.getFuel(this.vehicle!.id).subscribe(f => { this.fuel = f; });
      },
      error: err => {
        this.savingFuel = false;
        this.fuelError = err?.error?.error ?? 'Failed to save. Please try again.';
      }
    });
  }

  deleteFuel(recordId: number): void {
    if (!this.vehicle || !confirm('Delete this fuel record?')) return;
    this.vehicleService.deleteFuel(this.vehicle.id, recordId).subscribe({
      next: () => {
        this.fuel = this.fuel.filter(f => f.id !== recordId);
        this.vehicleService.getFuel(this.vehicle!.id).subscribe(f => { this.fuel = f; });
      }
    });
  }

  // ── Sharing ───────────────────────────────────────────────────────────────
  sendInvite(): void {
    if (!this.vehicle || !this.inviteEmail.trim()) return;
    this.inviting = true;
    this.inviteError = null;
    this.inviteSuccess = null;
    this.vehicleService.inviteAccess(this.vehicle.id, this.inviteEmail.trim()).subscribe({
      next: () => {
        this.inviteSuccess = `Invite sent to ${this.inviteEmail.trim()}`;
        this.inviteEmail = '';
        this.inviting = false;
        // Refresh sharing list
        this.vehicleService.getById(this.vehicle!.id).subscribe(v => { this.vehicle = v; });
      },
      error: err => {
        this.inviteError = err?.error?.error ?? 'Failed to send invite.';
        this.inviting = false;
      }
    });
  }

  revoke(access: VehicleAccess): void {
    if (!this.vehicle || !confirm(`Revoke access for ${access.inviteeEmail}?`)) return;
    this.revoking = access.id;
    this.vehicleService.revokeAccess(this.vehicle.id, access.id).subscribe({
      next: () => {
        this.revoking = null;
        this.vehicleService.getById(this.vehicle!.id).subscribe(v => { this.vehicle = v; });
      },
      error: err => {
        this.inviteError = err?.error?.error ?? 'Failed to revoke access.';
        this.revoking = null;
      }
    });
  }

  get activeShares(): VehicleAccess[] {
    return (this.vehicle?.sharedWith || []).filter(a => a.status !== 'REVOKED');
  }

  // ── Misc ──────────────────────────────────────────────────────────────────
  downloadReport(): void {
    if (!this.vehicle) return;
    window.location.href = this.vehicleService.downloadReport(this.vehicle.id);
  }

  photoUrl(filename: string): string {
    return this.vehicle ? this.vehicleService.photoUrl(this.vehicle.id, filename) : '';
  }

  maintenanceReceiptUrl(recordId: number, filename: string): string {
    return this.vehicle ? this.vehicleService.maintenanceReceiptUrl(this.vehicle.id, recordId, filename) : '';
  }

  deleteVehicle(): void {
    if (!this.vehicle || !confirm('Delete this vehicle? This cannot be undone.')) return;
    this.vehicleService.delete(this.vehicle.id).subscribe({
      next: () => this.router.navigate(['/garage'])
    });
  }
}
