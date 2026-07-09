import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly apiUrl = `${environment.apiUrl}/push`;
  private readonly source = 'PushService';

  constructor(private http: HttpClient, private logger: LoggerService) {}

  register(token: string, platform: 'IOS' | 'ANDROID'): Observable<any> {
    this.logger.info(this.source, `>>> register() platform=${platform}`);
    return this.http.post(`${this.apiUrl}/register`, { token, platform }).pipe(
      catchError(error => {
        this.logger.error(this.source, 'register() failed', error);
        return of(null);
      })
    );
  }

  unregister(token: string): Observable<any> {
    this.logger.info(this.source, '>>> unregister()');
    return this.http.delete(`${this.apiUrl}/register`, { body: { token } }).pipe(
      catchError(error => {
        this.logger.error(this.source, 'unregister() failed', error);
        return of(null);
      })
    );
  }
}
