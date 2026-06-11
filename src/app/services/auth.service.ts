import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

const LOCAL_DEV_USER: User = {
  id: 0,
  name: 'Local Dev User',
  email: 'dev@localhost.local',
  picture: '',
  authenticated: true,
  welcomeDismissed: true,
  storageConfigured: false,
  platformAdmin: false
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly source = 'AuthService';
  private user$ = new BehaviorSubject<User | null>(null);

  constructor(private http: HttpClient, private logger: LoggerService) {}

  /** Called once at app startup via APP_INITIALIZER */
  checkAuth(): Observable<User | null> {
    if (environment.localDev) {
      this.user$.next(LOCAL_DEV_USER);
      return of(LOCAL_DEV_USER);
    }

    const startTime = Date.now();
    this.logger.trace(this.source, '>>> checkAuth() - Checking authentication status');

    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      map(res => res.authenticated ? res as User : null),
      tap(user => {
        if (user) {
          this.logger.apiCall(this.source, 'GET', '/auth/me', startTime);
          this.logger.info(this.source, `<<< checkAuth() - AUTHENTICATED: id=${user.id}, email=${user.email}`);
        } else {
          this.logger.info(this.source, `<<< checkAuth() - NOT_AUTHENTICATED`);
        }
        this.user$.next(user);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/auth/me', error, startTime);
        this.user$.next(null);
        return of(null);
      })
    );
  }

  currentUser(): Observable<User | null> {
    return this.user$.asObservable();
  }

  isAuthenticated(): boolean {
    const authenticated = this.user$.getValue() !== null;
    this.logger.trace(this.source, `isAuthenticated() = ${authenticated}`);
    return authenticated;
  }

  getSnapshot(): User | null {
    return this.user$.getValue();
  }

  dismissWelcome(): Observable<any> {
    const user = this.user$.getValue();
    if (user) {
      this.user$.next({ ...user, welcomeDismissed: true });
    }
    return this.http.post(`${this.apiUrl}/dismiss-welcome`, {}).pipe(
      catchError(() => of(null))
    );
  }

  logout(): Observable<any> {
    const startTime = Date.now();
    this.logger.info(this.source, '>>> logout()');
    
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        this.logger.apiCall(this.source, 'POST', '/auth/logout', startTime);
        this.logger.info(this.source, '<<< logout() - SUCCESS');
        this.user$.next(null);
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'POST', '/auth/logout', error, startTime);
        this.user$.next(null);
        return of(null);
      })
    );
  }
}
