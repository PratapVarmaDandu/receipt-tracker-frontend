import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { FeatureService } from './services/feature.service';
import { OrganizationService } from './services/organization.service';
import { UiEventsService } from './services/ui-events.service';
import { User } from './models/user.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentUser: User | null = null;
  isLoginPage = false;
  showWelcomeBanner = false;
  sidebarOpen = false;
  hasPublicShop = false;

  constructor(
    private authService: AuthService,
    public features: FeatureService,
    private orgService: OrganizationService,
    private router: Router,
    private uiEvents: UiEventsService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser().subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Load feature entitlements so gated nav links can render
        this.features.ensureLoaded().subscribe();
        // Show Shop nav if any public store exists (regardless of SHOP_POS entitlement)
        this.orgService.getPublicStores().subscribe(
          stores => { this.hasPublicShop = stores.length > 0; }
        );
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
    ).subscribe(() => {
      const redirect = localStorage.getItem('postLoginRedirect');
      if (redirect) {
        localStorage.removeItem('postLoginRedirect');
        this.router.navigateByUrl(redirect);
      }
    });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url: string = e.urlAfterRedirects || e.url;
        // Strip query string / fragment so e.g. "/login?error=true" still counts as the login page
        const path: string = url.split('?')[0].split('#')[0];
        this.isLoginPage = path === '/login'
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

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
