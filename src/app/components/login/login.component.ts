import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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
    const url = `${environment.backendUrl}/oauth2/authorization/google`;
    if (Capacitor.isNativePlatform()) {
      // Google blocks OAuth consent inside a bare app WebView — use an in-app browser
      // (SFSafariViewController/Custom Tabs) instead. ?mobile=true tells the backend
      // to redirect back to the app's custom URL scheme instead of the web dashboard
      // (see MobileAwareOAuth2AuthorizationRequestResolver / OAuth2SuccessHandler).
      Browser.open({ url: `${url}?mobile=true` });
    } else {
      window.location.href = url;
    }
  }
}
