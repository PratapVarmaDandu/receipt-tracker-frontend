import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Vehicle, MAINTENANCE_TYPE_LABELS } from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { NhtsaService } from '../../services/nhtsa.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-garage',
  templateUrl: './garage.component.html',
  styleUrls: ['./garage.component.scss']
})
export class GarageComponent implements OnInit {
  private readonly source = 'GarageComponent';

  vehicles: Vehicle[] = [];
  loading = true;
  showAddPanel = false;
  addError: string | null = null;
  addingVehicle = false;

  // Add vehicle form
  makes: string[] = [];
  models: string[] = [];
  selectedMake: string = '';
  selectedYear: number = new Date().getFullYear();
  selectedModel: string = '';
  customVin: string = '';
  newVehicle: Partial<Vehicle> = {};

  years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

  constructor(
    private vehicleService: VehicleService,
    private nhtsaService: NhtsaService,
    private logger: LoggerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadMakes();
  }

  load(): void {
    this.loading = true;
    this.vehicleService.list().subscribe({
      next: vehicles => {
        this.vehicles = vehicles;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadMakes(): void {
    this.nhtsaService.getMakes().subscribe(makes => {
      this.makes = makes;
      this.logger.debug(this.source, `loaded ${makes.length} makes`);
    });
  }

  onMakeChange(): void {
    this.models = [];
    this.selectedModel = '';
    if (this.selectedMake) {
      this.nhtsaService.getModels(this.selectedMake, this.selectedYear).subscribe(
        models => { this.models = models; }
      );
    }
  }

  onYearChange(): void {
    if (this.selectedMake) this.onMakeChange();
  }

  decodeVin(): void {
    if (!this.customVin.trim()) return;
    this.nhtsaService.decodeVin(this.customVin, this.selectedYear).subscribe(decoded => {
      if (decoded && decoded['make']) {
        this.selectedMake = decoded['make'];
        this.onMakeChange();
        if (decoded['model']) {
          this.selectedModel = decoded['model'];
        }
      }
    });
  }

  submitAdd(): void {
    if (!this.selectedMake || !this.selectedModel || !this.selectedYear) {
      this.addError = 'Make, model, and year are required.';
      return;
    }
    this.addingVehicle = true;
    this.addError = null;

    const vehicle: Partial<Vehicle> = {
      make: this.selectedMake,
      model: this.selectedModel,
      modelYear: this.selectedYear,
      vin: this.customVin.trim() || undefined,
      ...this.newVehicle
    };

    this.vehicleService.create(vehicle).subscribe({
      next: v => {
        this.addingVehicle = false;
        this.vehicles.unshift(v);
        this.showAddPanel = false;
        this.resetForm();
        this.logger.info(this.source, `added vehicle id=${v.id}`);
      },
      error: err => {
        this.addingVehicle = false;
        this.addError = err?.error?.error ?? 'Failed to add vehicle.';
        this.logger.error(this.source, 'add failed', err);
      }
    });
  }

  resetForm(): void {
    this.selectedMake = '';
    this.selectedModel = '';
    this.selectedYear = new Date().getFullYear();
    this.customVin = '';
    this.newVehicle = {};
    this.models = [];
  }

  openVehicle(id: number): void {
    this.router.navigate(['/garage', id]);
  }

  deleteVehicle(v: Vehicle): void {
    if (!confirm(`Delete ${v.modelYear} ${v.make} ${v.model}?`)) return;
    this.vehicleService.delete(v.id).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter(x => x.id !== v.id);
        this.logger.info(this.source, `deleted vehicle id=${v.id}`);
      },
      error: err => this.logger.error(this.source, 'delete failed', err)
    });
  }

  getExpiryClass(status?: string): string {
    if (!status) return '';
    if (status === 'EXPIRED') return 'text-danger';
    if (status === 'EXPIRING_SOON') return 'text-warning';
    return 'text-success';
  }

  trackById(_: number, v: Vehicle): number { return v.id; }
}
