import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private uiEvents: UiEventsService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser().subscribe(user => {
      this.currentUser = user;
      // Show banner for authenticated users who haven't dismissed it
      if (user && !user.welcomeDismissed) {
        this.showWelcomeBanner = true;
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
        this.isLoginPage = url === '/login' || url.startsWith('/share/') || url.startsWith('/group/join/');
        this.sidebarOpen = false;
        document.body.classList.remove('sidebar-open');
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
