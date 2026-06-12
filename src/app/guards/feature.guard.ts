import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeatureService } from '../services/feature.service';

/**
 * Gates a route on a feature entitlement declared in route data:
 *   { path: 'garage', ..., canActivate: [AuthGuard, FeatureGuard], data: { feature: 'GARAGE' } }
 * Redirects to /locked/<feature> when the user's orgs lack the feature.
 */
@Injectable({ providedIn: 'root' })
export class FeatureGuard implements CanActivate {
  constructor(private featureService: FeatureService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const feature = route.data['feature'] as string | undefined;
    if (!feature) return of(true);

    return this.featureService.ensureLoaded().pipe(
      map(features => features.has(feature)
        ? true
        : this.router.createUrlTree(['/locked', feature]))
    );
  }
}
