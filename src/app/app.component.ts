import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthService } from './services/auth.service';
import { FeatureService } from './services/feature.service';
import { OrganizationService } from './services/organization.service';
import { PushService } from './services/push.service';
import { ReferralService } from './services/referral.service';
import { UiEventsService } from './services/ui-events.service';
import { LoggerService } from './services/logger.service';
import { User } from './models/user.model';

const PUSH_TOKEN_STORAGE_KEY = 'pushDeviceToken';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentUser: User | null = null;
  isLoginPage = false;
  showWelcomeBanner = false;
  showSecurityInfo = false;
  sidebarOpen = false;
  hasPublicShop = false;

  private readonly source = 'AppComponent';

  constructor(
    private authService: AuthService,
    public features: FeatureService,
    private orgService: OrganizationService,
    private pushService: PushService,
    private referralService: ReferralService,
    private router: Router,
    private uiEvents: UiEventsService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Native shell only: OAuth2SuccessHandler redirects to this custom URL scheme after a
    // mobile login (see login.component.ts / MobileAwareOAuth2AuthorizationRequestResolver).
    // The OS hands control back to the app, closes the in-app browser, and re-checks auth.
    if (Capacitor.isNativePlatform()) {
      // By default the WKWebView draws edge-to-edge and the native status bar floats on
      // top of it, overlapping the app's own fixed header. The existing safe-area CSS
      // (env(safe-area-inset-top)) is written for mobile Safari's rendering model, not
      // Capacitor's — so instead push the webview itself below the status bar natively.
      StatusBar.setOverlaysWebView({ overlay: false })
        .then(() => this.logger.info(this.source, 'StatusBar.setOverlaysWebView(false) applied'))
        .catch(err => this.logger.error(this.source, 'StatusBar.setOverlaysWebView failed — plugin may not be linked in this build', err));
      StatusBar.setStyle({ style: Style.Dark }).catch(err =>
        this.logger.error(this.source, 'StatusBar.setStyle failed', err));

      App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        if (event.url.startsWith('receipttracker://auth-callback')) {
          Browser.close();
          this.authService.checkAuth().subscribe(() => {
            this.router.navigate(['/dashboard']);
          });
        }
      });

      // Fires once the OS hands back a device token; forward it to the backend so
      // JobFollowUpReminderService can push to this device (see push.service.ts).
      PushNotifications.addListener('registration', (token: Token) => {
        const platform = Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID';
        localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token.value);
        this.pushService.register(token.value, platform).subscribe();
      });
    }

    this.authService.currentUser().subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Load feature entitlements so gated nav links can render
        this.features.ensureLoaded().subscribe();
        // Show Shop nav if any public store exists (regardless of SHOP_POS entitlement)
        this.orgService.getPublicStores().subscribe(
          stores => { this.hasPublicShop = stores.length > 0; }
        );
        if (Capacitor.isNativePlatform()) {
          PushNotifications.requestPermissions().then(result => {
            if (result.receive === 'granted') {
              PushNotifications.register();
            }
          });
        }
      } else {
        this.hasPublicShop = false;
      }
      if (user && !user.welcomeDismissed) {
        this.showWelcomeBanner = true;
      }
      // Tag New Relic session with the logged-in user so sessions are filterable by email
      const nr = (window as any).newrelic;
      if (nr) {
        if (user) {
          nr.setCustomAttribute('userId', String(user.id));
          nr.setCustomAttribute('userEmail', user.email);
          nr.setCustomAttribute('userName', user.name);
        } else {
          nr.setCustomAttribute('userId', null);
          nr.setCustomAttribute('userEmail', null);
        }
      }
    });

    // After login, redirect back to the share page if the user clicked "Login" from a share invite
    this.authService.currentUser().pipe(
      filter(user => user !== null),
      take(1)
    ).subscribe(user => {
      const redirect = localStorage.getItem('postLoginRedirect');
      if (redirect) {
        localStorage.removeItem('postLoginRedirect');
        this.router.navigateByUrl(redirect);
      }
      // Attempts the claim only once, right after this fresh login (see ReferralService).
      this.referralService.claimPendingCodeIfAny(!!user!.isNewUser);
    });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = e.urlAfterRedirects || e.url;
        // Strip query string / fragment so e.g. "/login?error=true" still counts as the login page
        const path: string = url.split('?')[0].split('#')[0];
        this.isLoginPage = path === '/login'
          || path === '/'
          || path === '/welcome-preview'
          || url.startsWith('/share/')
          || url.startsWith('/group/join/')
          || url.startsWith('/documents/shared/')
          || url.startsWith('/garage/join/')
          || url.startsWith('/admin/join/')
          || url.startsWith('/immigration/cases/join/')
          || url.startsWith('/immigration/orgs/join/')
          || url.startsWith('/immigration/data-request/')
          || url.startsWith('/immigration/packages/questionnaire/');
        this.sidebarOpen = false;
        document.body.classList.remove('sidebar-open');
        // Tell New Relic which SPA route the user navigated to
        const nr = (window as any).newrelic;
        if (nr) {
          nr.setCurrentRouteName(url);
        }
      });

    this.uiEvents.openWelcomeBanner$.subscribe(() => {
      this.showWelcomeBanner = true;
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    document.body.classList.toggle('sidebar-open', this.sidebarOpen);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    document.body.classList.remove('sidebar-open');
  }

  onBannerClosed(): void {
    this.showWelcomeBanner = false;
  }

  openWelcomeBanner(): void {
    this.showWelcomeBanner = true;
  }

  openSecurityInfo(): void {
    this.showSecurityInfo = true;
  }

  closeSecurityInfo(): void {
    this.showSecurityInfo = false;
  }

  logout(): void {
    const finishLogout = () => {
      this.authService.logout().subscribe(() => {
        this.router.navigate(['/']);
      });
    };
    // Unregister before invalidating the session — /api/push/register requires auth.
    const token = Capacitor.isNativePlatform() ? localStorage.getItem(PUSH_TOKEN_STORAGE_KEY) : null;
    if (token) {
      this.pushService.unregister(token).subscribe(() => {
        localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
        finishLogout();
      });
    } else {
      finishLogout();
    }
  }
}
