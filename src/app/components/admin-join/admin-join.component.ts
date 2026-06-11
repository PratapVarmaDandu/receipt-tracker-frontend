import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { OrgMember } from '../../models/organization.model';

@Component({
  selector: 'app-admin-join',
  templateUrl: './admin-join.component.html',
  styleUrls: ['./admin-join.component.scss']
})
export class AdminJoinComponent implements OnInit {
  private readonly source = 'AdminJoinComponent';

  token = '';
  invite: OrgMember | null = null;
  loading = true;
  accepting = false;
  accepted = false;
  error = '';

  isLoggedIn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrganizationService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    const user = this.authService.getSnapshot();
    this.isLoggedIn = !!user;

    this.orgService.getInviteByToken(this.token).subscribe({
      next: invite => { this.invite = invite; this.loading = false; },
      error: err => {
        this.error = err?.error?.error || 'Invite not found or has been revoked.';
        this.loading = false;
        this.logger.error(this.source, 'getInvite failed', err);
      }
    });
  }

  login(): void {
    localStorage.setItem('postLoginRedirect', `/admin/join/${this.token}`);
    window.location.href = '/oauth2/authorization/google';
  }

  accept(): void {
    this.accepting = true;
    this.error = '';
    this.orgService.acceptInvite(this.token).subscribe({
      next: () => {
        this.accepting = false;
        this.accepted = true;
      },
      error: err => {
        this.accepting = false;
        this.error = err?.error?.error || 'Failed to accept invite.';
        this.logger.error(this.source, 'acceptInvite failed', err);
      }
    });
  }

  goDashboard(): void { this.router.navigate(['/admin']); }
}
