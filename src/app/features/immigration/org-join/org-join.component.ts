import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { ImmOrgMember } from '../../../models/imm-org.model';
import { AuthService } from '../../../services/auth.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-org-join',
  templateUrl: './org-join.component.html',
  styleUrls: ['./org-join.component.scss']
})
export class OrgJoinComponent implements OnInit {
  private readonly source = 'OrgJoinComponent';

  token: string | null = null;
  invite: ImmOrgMember | null = null;
  loading = true;
  accepting = false;
  error: string | null = null;
  accepted = false;
  isLoggedIn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immOrgService: ImmOrgService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.token = this.route.snapshot.paramMap.get('token');
    this.isLoggedIn = this.authService.getSnapshot() != null;

    if (!this.token) {
      this.error = 'Invalid invitation link.';
      this.loading = false;
      return;
    }

    this.immOrgService.getJoinInfo(this.token).subscribe({
      next: info => {
        this.invite = info;
        this.loading = false;
        this.logger.info(this.source, `Loaded firm invite for ${info.email}`);
      },
      error: err => {
        this.error = err?.error?.error || 'Invalid or expired invitation link.';
        this.loading = false;
        this.logger.error(this.source, 'getJoinInfo failed', err);
      }
    });
  }

  roleLabel(role: string | undefined): string {
    if (!role) return 'Team Member';
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  login(): void {
    localStorage.setItem('postLoginRedirect', `/immigration/orgs/join/${this.token}`);
    window.location.href = '/oauth2/authorization/google';
  }

  accept(): void {
    if (!this.token || !this.isLoggedIn) return;
    this.accepting = true;
    this.error = null;

    this.immOrgService.acceptInvite(this.token).subscribe({
      next: () => {
        this.accepted = true;
        this.accepting = false;
        this.logger.info(this.source, 'Accepted firm invite');
        setTimeout(() => this.router.navigate(['/immigration/attorney']), 1500);
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to accept invitation.';
        this.accepting = false;
        this.logger.error(this.source, 'acceptInvite failed', err);
      }
    });
  }
}
