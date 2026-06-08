import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { Receipt } from '../models/receipt.model';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  private base = `${environment.apiUrl}/receipts`;
  private readonly source = 'ReceiptService';

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getAll(): Observable<Receipt[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> getAll() - Fetching all receipts');
    
    return this.http.get<Receipt[]>(this.base).pipe(
      tap(receipts => {
        this.logger.apiCall(this.source, 'GET', '/receipts', startTime);
        this.logger.debug(this.source, `<<< getAll() - Retrieved ${receipts.length} receipts`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/receipts', error, startTime);
        throw error;
      })
    );
  }

  getById(id: number): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> getById(${id}) - Fetching receipt`);
    
    return this.http.get<Receipt>(`${this.base}/${id}`).pipe(
      tap(receipt => {
        this.logger.apiCall(this.source, 'GET', `/receipts/${id}`, startTime);
        this.logger.debug(this.source, `<<< getById(${id}) - Retrieved: store=${receipt.storeName}, total=${receipt.total}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', `/receipts/${id}`, error, startTime);
        throw error;
      })
    );
  }

  upload(file: File): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> upload() - Uploading file: name=${file.name}, size=${file.size}B, type=${file.type}`);
    
    const fd = new FormData();
    fd.append('file', file);
    
    return this.http.post<Receipt>(`${this.base}/upload`, fd).pipe(
      timeout(280000),
      tap(receipt => {
        this.logger.apiCall(this.source, 'POST', '/receipts/upload', startTime);
        this.logger.info(this.source,
          `<<< upload() - SUCCESS: receiptId=${receipt.id}, store=${receipt.storeName}, total=${receipt.total}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'POST', '/receipts/upload', error, startTime);
        throw error;
      })
    );
  }

  createManual(receipt: Partial<Receipt>): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> createManual() - store=${receipt.storeName}, total=${receipt.total}`);
    
    return this.http.post<Receipt>(`${this.base}/manual`, receipt).pipe(
      tap(result => {
        this.logger.apiCall(this.source, 'POST', '/receipts/manual', startTime);
        this.logger.info(this.source, `<<< createManual() - SUCCESS: receiptId=${result.id}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'POST', '/receipts/manual', error, startTime);
        throw error;
      })
    );
  }

  update(id: number, receipt: Partial<Receipt>): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> update(${id}) - store=${receipt.storeName}, total=${receipt.total}`);
    
    return this.http.put<Receipt>(`${this.base}/${id}`, receipt).pipe(
      tap(result => {
        this.logger.apiCall(this.source, 'PUT', `/receipts/${id}`, startTime);
        this.logger.info(this.source, `<<< update(${id}) - SUCCESS`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'PUT', `/receipts/${id}`, error, startTime);
        throw error;
      })
    );
  }

  delete(id: number): Observable<void> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> delete(${id})`);

    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => {
        this.logger.apiCall(this.source, 'DELETE', `/receipts/${id}`, startTime);
        this.logger.info(this.source, `<<< delete(${id}) - SUCCESS`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'DELETE', `/receipts/${id}`, error, startTime);
        throw error;
      })
    );
  }

  addToGroup(id: number, groupId: number | null): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> addToGroup(receiptId=${id}, groupId=${groupId})`);
    return this.http.put<Receipt>(`${this.base}/${id}/group`, { groupId }).pipe(
      tap(result => {
        this.logger.apiCall(this.source, 'PUT', `/receipts/${id}/group`, startTime);
        this.logger.info(this.source, `<<< addToGroup - groupId=${result.groupId}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'PUT', `/receipts/${id}/group`, error, startTime);
        throw error;
      })
    );
  }

  linkToVehicle(id: number, vehicleId: number | null, vehicleCategory?: string | null): Observable<Receipt> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> linkToVehicle(receiptId=${id}, vehicleId=${vehicleId}, category=${vehicleCategory})`);
    return this.http.put<Receipt>(`${this.base}/${id}/vehicle`, { vehicleId, vehicleCategory: vehicleCategory ?? null }).pipe(
      tap(result => {
        this.logger.apiCall(this.source, 'PUT', `/receipts/${id}/vehicle`, startTime);
        this.logger.info(this.source, `<<< linkToVehicle - vehicleId=${result.vehicleId}`);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'PUT', `/receipts/${id}/vehicle`, error, startTime);
        throw error;
      })
    );
  }
}
