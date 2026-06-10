import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { SquareCatalogItem, CreateOrderRequest, OrderResponse, StoreLocation } from '../models/square.model';

@Injectable({ providedIn: 'root' })
export class SquareService {
  private base = `${environment.apiUrl}/square`;
  private readonly source = 'SquareService';

  constructor(private http: HttpClient, private logger: LoggerService) {}

  getCatalog(cursor?: string): Observable<SquareCatalogItem[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> getCatalog(cursor=${cursor})`);
    let params = new HttpParams();
    if (cursor) params = params.set('cursor', cursor);

    return this.http.get<SquareCatalogItem[]>(`${this.base}/catalog`, { params }).pipe(
      tap(items => this.logger.apiCall(this.source, 'GET', '/square/catalog', startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/square/catalog', err, startTime);
        throw err;
      })
    );
  }

  getCategories(): Observable<{ id: string; name: string }[]> {
    const startTime = Date.now();
    return this.http.get<{ id: string; name: string }[]>(`${this.base}/catalog/categories`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/square/catalog/categories', startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/square/catalog/categories', err, startTime);
        throw err;
      })
    );
  }

  getLocations(): Observable<StoreLocation[]> {
    const startTime = Date.now();
    return this.http.get<StoreLocation[]>(`${this.base}/locations`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/square/locations', startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/square/locations', err, startTime);
        throw err;
      })
    );
  }

  getConfig(): Observable<{ applicationId: string; locationId: string; environment: string }> {
    const startTime = Date.now();
    return this.http.get<{ applicationId: string; locationId: string; environment: string }>(`${this.base}/config`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/square/config', startTime)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/square/config', err, startTime);
        throw err;
      })
    );
  }

  createPayment(request: CreateOrderRequest): Observable<OrderResponse> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> createPayment items=${request.items.length} type=${request.fulfillmentType}`);
    return this.http.post<OrderResponse>(`${this.base}/payments`, request).pipe(
      tap(res => {
        this.logger.apiCall(this.source, 'POST', '/square/payments', startTime);
        this.logger.info(this.source, `<<< createPayment squareOrderId=${res.squareOrderId} receiptId=${res.receiptId}`);
      }),
      catchError(err => {
        this.logger.apiError(this.source, 'POST', '/square/payments', err, startTime);
        throw err;
      })
    );
  }
}
