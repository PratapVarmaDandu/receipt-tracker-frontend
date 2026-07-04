import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { AUDIENCES, FEATURES, FeatureCard } from './landing-features.data';

interface AudienceGroup {
  key: string;
  label: string;
  icon: string;
  features: FeatureCard[];
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  readonly groups: AudienceGroup[] = AUDIENCES.map(a => ({
    key: a.key,
    label: a.label,
    icon: a.icon,
    features: FEATURES.filter(f => f.audiences.includes(a.key))
  }));

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Dev-only /welcome-preview route: always render the marketing page,
    // bypassing the redirect (local dev's mocked auth would otherwise
    // bounce straight to /dashboard before it could ever be reviewed).
    if (this.route.snapshot.data['preview']) return;

    this.authService.checkAuth().subscribe(user => {
      if (user) this.router.navigate(['/dashboard']);
    });
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  scrollToFeatures(): void {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }
}
