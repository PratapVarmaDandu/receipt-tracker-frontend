import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NhtsaService {
  private readonly api = `${environment.apiUrl}/nhtsa`;

  constructor(private http: HttpClient) {}

  getMakes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/makes`).pipe(
      catchError(() => of([]))
    );
  }

  getModels(make: string, year: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/models`, {
      params: { make, year: year.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  decodeVin(vin: string, year?: number): Observable<Record<string, string>> {
    const params: any = {};
    if (year) params.year = year;
    return this.http.get<Record<string, string>>(`${this.api}/vin/${vin}`, { params }).pipe(
      catchError(() => of({}))
    );
  }
}
