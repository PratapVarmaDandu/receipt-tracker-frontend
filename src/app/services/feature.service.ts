import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

/**
 * Per-org feature entitlements for the logged-in user.
 * Backed by GET /api/me/features; cached for the session and
 * reset whenever the auth user changes (login/logout).
 */
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly apiUrl = `${environment.apiUrl}/me/features`;
  private readonly source = 'FeatureService';

  /** null = not loaded yet */
  private features$ = new BehaviorSubject<Set<string> | null>(null);
  private inflight$: Observable<Set<string>> | null = null;
  private lastUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private logger: LoggerService
  ) {
    // Reset cache when the logged-in user changes
    this.authService.currentUser().subscribe(user => {
      const userId = user ? user.id : null;
      if (userId !== this.lastUserId) {
        this.lastUserId = userId;
        this.features$.next(null);
        this.inflight$ = null;
      }
    });
  }

  /** Loads the feature set once; concurrent callers share the same request. */
  ensureLoaded(): Observable<Set<string>> {
    const cached = this.features$.getValue();
    if (cached !== null) return of(cached);
    if (this.inflight$) return this.inflight$;

    const startTime = Date.now();
    this.logger.trace(this.source, '>>> ensureLoaded() - fetching /me/features');
    this.inflight$ = this.http.get<string[]>(this.apiUrl).pipe(
      map(names => new Set(names)),
      tap(set => {
        this.logger.apiCall(this.source, 'GET', '/me/features', startTime);
        this.logger.info(this.source, `<<< ensureLoaded() - features: [${[...set].join(', ')}]`);
        this.features$.next(set);
        this.inflight$ = null;
      }),
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/me/features', error, startTime);
        this.inflight$ = null;
        // Not cached — next navigation retries; treat as no features for now
        return of(new Set<string>());
      }),
      shareReplay(1)
    );
    return this.inflight$;
  }

  /** Synchronous check for templates/nav. False until loaded. */
  has(feature: string): boolean {
    const set = this.features$.getValue();
    return set !== null && set.has(feature);
  }

  /** Clears the cache and re-fetches features. Used after a subscription purchase. */
  reload(): Observable<Set<string>> {
    this.features$.next(null);
    this.inflight$ = null;
    return this.ensureLoaded();
  }

  /** Reactive view for components that need to re-render after load. */
  watch(): Observable<Set<string> | null> {
    return this.features$.asObservable();
  }
}
