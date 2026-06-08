import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { Vehicle, MaintenanceRecord, FuelRecord, MaintenanceScheduleItem, Recall, VehicleAccess } from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly source = 'VehicleService';
  private readonly api = `${environment.apiUrl}/vehicles`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  // ── Vehicle CRUD ──────────────────────────────────────────────────────────

  create(vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.api, vehicle).pipe(
      tap(v => this.logger.info(this.source, `created vehicle id=${v.id}`)),
      catchError(err => { throw err; })
    );
  }

  list(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.api).pipe(
      catchError(() => of([]))
    );
  }

  getById(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.api}/${id}`).pipe(
      catchError(err => { throw err; })
    );
  }

  update(id: number, vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.api}/${id}`, vehicle).pipe(
      catchError(err => { throw err; })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      catchError(err => { throw err; })
    );
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  addPhoto(vehicleId: number, file: File): Observable<Vehicle> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Vehicle>(`${this.api}/${vehicleId}/photos`, fd).pipe(
      catchError(err => { throw err; })
    );
  }

  removePhoto(vehicleId: number, filename: string): Observable<Vehicle> {
    return this.http.delete<Vehicle>(`${this.api}/${vehicleId}/photos/${filename}`).pipe(
      catchError(err => { throw err; })
    );
  }

  photoUrl(vehicleId: number, filename: string): string {
    return `${this.api}/${vehicleId}/photos/${filename}`;
  }

  // ── Schedule ──────────────────────────────────────────────────────────────

  getSchedule(vehicleId: number): Observable<MaintenanceScheduleItem[]> {
    return this.http.get<MaintenanceScheduleItem[]>(`${this.api}/${vehicleId}/schedule`).pipe(
      catchError(() => of([]))
    );
  }

  // ── Recalls ───────────────────────────────────────────────────────────────

  getRecalls(vehicleId: number): Observable<Recall[]> {
    return this.http.get<Recall[]>(`${this.api}/${vehicleId}/recalls`).pipe(
      catchError(() => of([]))
    );
  }

  // ── Linked Receipts ───────────────────────────────────────────────────────

  getVehicleReceipts(vehicleId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/${vehicleId}/receipts`).pipe(
      catchError(() => of([]))
    );
  }

  // ── PDF Report ────────────────────────────────────────────────────────────

  downloadReport(vehicleId: number): string {
    return `${this.api}/${vehicleId}/report`;
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  addMaintenance(vehicleId: number, record: Partial<MaintenanceRecord>, receiptFile?: File): Observable<MaintenanceRecord> {
    const fd = new FormData();
    fd.append('record', new Blob([JSON.stringify(record)], { type: 'application/json' }));
    if (receiptFile) fd.append('receipt', receiptFile);
    return this.http.post<MaintenanceRecord>(`${this.api}/${vehicleId}/maintenance`, fd).pipe(
      catchError(err => { throw err; })
    );
  }

  getMaintenance(vehicleId: number): Observable<MaintenanceRecord[]> {
    return this.http.get<MaintenanceRecord[]>(`${this.api}/${vehicleId}/maintenance`).pipe(
      catchError(() => of([]))
    );
  }

  updateMaintenance(vehicleId: number, recordId: number, record: Partial<MaintenanceRecord>, receiptFile?: File): Observable<MaintenanceRecord> {
    const fd = new FormData();
    fd.append('record', new Blob([JSON.stringify(record)], { type: 'application/json' }));
    if (receiptFile) fd.append('receipt', receiptFile);
    return this.http.put<MaintenanceRecord>(`${this.api}/${vehicleId}/maintenance/${recordId}`, fd).pipe(
      catchError(err => { throw err; })
    );
  }

  deleteMaintenance(vehicleId: number, recordId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${vehicleId}/maintenance/${recordId}`).pipe(
      catchError(err => { throw err; })
    );
  }

  maintenanceReceiptUrl(vehicleId: number, recordId: number, filename: string): string {
    return `${this.api}/${vehicleId}/maintenance/${recordId}/receipt/${filename}`;
  }

  // ── Fuel ───────────────────────────────────────────────────────────────────

  addFuel(vehicleId: number, record: Partial<FuelRecord>): Observable<FuelRecord> {
    return this.http.post<FuelRecord>(`${this.api}/${vehicleId}/fuel`, record).pipe(
      catchError(err => { throw err; })
    );
  }

  getFuel(vehicleId: number): Observable<FuelRecord[]> {
    return this.http.get<FuelRecord[]>(`${this.api}/${vehicleId}/fuel`).pipe(
      catchError(() => of([]))
    );
  }

  updateFuel(vehicleId: number, recordId: number, record: Partial<FuelRecord>): Observable<FuelRecord> {
    return this.http.put<FuelRecord>(`${this.api}/${vehicleId}/fuel/${recordId}`, record).pipe(
      catchError(err => { throw err; })
    );
  }

  deleteFuel(vehicleId: number, recordId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${vehicleId}/fuel/${recordId}`).pipe(
      catchError(err => { throw err; })
    );
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  inviteAccess(vehicleId: number, email: string): Observable<VehicleAccess> {
    return this.http.post<VehicleAccess>(`${this.api}/${vehicleId}/access`, { email }).pipe(
      catchError(err => { throw err; })
    );
  }

  getAccess(vehicleId: number): Observable<VehicleAccess[]> {
    return this.http.get<VehicleAccess[]>(`${this.api}/${vehicleId}/access`).pipe(
      catchError(() => of([]))
    );
  }

  revokeAccess(vehicleId: number, accessId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${vehicleId}/access/${accessId}`).pipe(
      catchError(err => { throw err; })
    );
  }

  getInviteByToken(token: string): Observable<VehicleAccess> {
    return this.http.get<VehicleAccess>(`${this.api}/access/join/${token}`).pipe(
      catchError(err => { throw err; })
    );
  }

  acceptInvite(token: string): Observable<VehicleAccess> {
    return this.http.post<VehicleAccess>(`${this.api}/access/join/${token}`, {}).pipe(
      catchError(err => { throw err; })
    );
  }
}
