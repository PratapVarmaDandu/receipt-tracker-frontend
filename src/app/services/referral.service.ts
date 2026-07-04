import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

export interface ReferralSummary {
  referralCode: string | null;
  shareLink: string | null;
  totalReferrals: number;
  rewardedReferrals: number;
  annualCap: number;
}

const PENDING_CODE_KEY = 'pendingReferralCode';

@Injectable({ providedIn: 'root' })
export class ReferralService {
  private readonly source = 'ReferralService';
  private readonly apiUrl = `${environment.apiUrl}/referrals`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  /** Called once on the login page — stores a `?ref=` code so it survives the OAuth redirect round-trip. */
  capturePendingCode(code: string | null): void {
    if (code) {
      sessionStorage.setItem(PENDING_CODE_KEY, code);
    }
  }

  /**
   * Called once after a fresh login (see AppComponent). Only fires the claim request
   * when there's a stored code AND the user is flagged `isNewUser` by the backend —
   * the endpoint itself independently enforces this via a session flag, so an errant
   * extra call here is rejected server-side rather than silently granting anything.
   */
  claimPendingCodeIfAny(isNewUser: boolean): void {
    const code = sessionStorage.getItem(PENDING_CODE_KEY);
    if (!code) {
      return;
    }
    sessionStorage.removeItem(PENDING_CODE_KEY);
    if (!isNewUser) {
      return;
    }
    this.logger.trace(this.source, '>>> claimPendingCodeIfAny() - attempting claim');
    this.http.post(`${this.apiUrl}/claim`, { code }).pipe(
      catchError(error => {
        this.logger.apiError(this.source, 'POST', '/referrals/claim', error, Date.now());
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.logger.info(this.source, '<<< claimPendingCodeIfAny() - referral claimed');
      }
    });
  }

  getMine(): Observable<ReferralSummary | null> {
    const startTime = Date.now();
    return this.http.get<ReferralSummary>(`${this.apiUrl}/mine`).pipe(
      catchError(error => {
        this.logger.apiError(this.source, 'GET', '/referrals/mine', error, startTime);
        return of(null);
      })
    );
  }
}
