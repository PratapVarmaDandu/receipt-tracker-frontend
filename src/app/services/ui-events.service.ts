import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiEventsService {
  readonly openWelcomeBanner$ = new Subject<void>();

  openWelcomeBanner(): void {
    this.openWelcomeBanner$.next();
  }
}
