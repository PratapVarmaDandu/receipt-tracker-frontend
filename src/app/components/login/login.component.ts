import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReferralService } from '../../services/referral.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  error = '';

  constructor(
    private authService: AuthService,
    private referralService: ReferralService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.checkAuth().subscribe(user => {
      if (user) this.router.navigate(['/dashboard']);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      this.error = 'Sign-in failed. Please try again or contact support.';
    }
    // Stored in sessionStorage so it survives the Google OAuth redirect round-trip;
    // AppComponent attempts the claim once login completes (see claimPendingCodeIfAny).
    this.referralService.capturePendingCode(params.get('ref'));
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }
}
