import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageConfig, StorageTestResult, StorageUsage } from '../models/storage-config.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly apiUrl = `${environment.apiUrl}/storage`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<StorageConfig> {
    return this.http.get<StorageConfig>(`${this.apiUrl}/config`);
  }

  saveConfig(config: StorageConfig): Observable<StorageConfig> {
    return this.http.post<StorageConfig>(`${this.apiUrl}/config`, config);
  }

  testConnection(config: StorageConfig): Observable<StorageTestResult> {
    return this.http.post<StorageTestResult>(`${this.apiUrl}/test`, config);
  }

  getUsage(): Observable<StorageUsage> {
    return this.http.get<StorageUsage>(`${this.apiUrl}/usage`);
  }
}
