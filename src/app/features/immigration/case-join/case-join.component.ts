import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImmigrationService, ImmigrationCase, CASE_TYPE_LABELS } from '../../../services/immigration.service';
import { AuthService } from '../../../services/auth.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-case-join',
  templateUrl: './case-join.component.html',
  styleUrls: ['./case-join.component.scss']
})
export class CaseJoinComponent implements OnInit {
  private readonly source = 'CaseJoinComponent';

  token: string | null = null;
  caseInfo: ImmigrationCase | null = null;
  loading = true;
  accepting = false;
  error: string | null = null;
  accepted = false;
  isLoggedIn = false;

  readonly caseTypeLabels = CASE_TYPE_LABELS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immigrationService: ImmigrationService,
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

    this.immigrationService.getCaseByInviteToken(this.token).subscribe({
      next: info => {
        this.caseInfo = info;
        this.loading = false;
        this.logger.info(this.source, `Loaded invite for case ${info.caseNumber}`);
      },
      error: err => {
        this.error = err?.error?.error || 'Invalid or expired invitation link.';
        this.loading = false;
        this.logger.error(this.source, 'getCaseByInviteToken failed', err);
      }
    });
  }

  login(): void {
    localStorage.setItem('postLoginRedirect', `/immigration/cases/join/${this.token}`);
    window.location.href = '/oauth2/authorization/google';
  }

  accept(): void {
    if (!this.token || !this.isLoggedIn) return;
    this.accepting = true;
    this.error = null;

    this.immigrationService.acceptCaseInvite(this.token).subscribe({
      next: c => {
        this.accepted = true;
        this.accepting = false;
        this.logger.info(this.source, `Accepted invite for case ${c.caseNumber}`);
        setTimeout(() => this.router.navigate(['/immigration/cases', c.id]), 1500);
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to accept invitation.';
        this.accepting = false;
        this.logger.error(this.source, 'acceptCaseInvite failed', err);
      }
    });
  }
}
