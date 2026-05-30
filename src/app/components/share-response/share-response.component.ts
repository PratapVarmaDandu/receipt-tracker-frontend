import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExpenseShareService } from '../../services/expense-share.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { ShareViewData } from '../../models/expense-share.model';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-share-response',
  templateUrl: './share-response.component.html',
  styleUrls: ['./share-response.component.scss']
})
export class ShareResponseComponent implements OnInit {
  private readonly source = 'ShareResponseComponent';

  token = '';
  data: ShareViewData | null = null;
  currentUser: User | null = null;
  loading = true;
  notFound = false;
  submitting = false;
  actionDone = false;
  error: string | null = null;

  showChangeForm = false;
  counterAmount: number | null = null;
  counterNote = '';

  constructor(
    private route: ActivatedRoute,
    private shareService: ExpenseShareService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.logger.trace(this.source, `>>> ngOnInit token=${this.token}`);

    this.authService.currentUser().subscribe(user => {
      this.currentUser = user;
    });

    this.shareService.getShareByToken(this.token).subscribe(data => {
      if (!data) {
        this.notFound = true;
      } else {
        this.data = data;
        // Auto-redirect unauthenticated invitees to login immediately
        if (!this.currentUser && this.isActionable(data.status)) {
          this.onLoginClick();
        }
      }
      this.loading = false;
    });
  }

  private isActionable(status: string): boolean {
    return status === 'PENDING' || status === 'CHANGE_REJECTED';
  }

  get canAct(): boolean {
    if (!this.data) return false;
    const s = this.data.status;
    return (s === 'PENDING' || s === 'CHANGE_REJECTED') && !!this.currentUser;
  }

  accept(): void {
    this.runAction('ACCEPT');
  }

  deny(): void {
    if (!confirm('Are you sure you want to deny this expense share?')) return;
    this.runAction('DENY');
  }

  submitChangeRequest(): void {
    if (!this.counterAmount || this.counterAmount <= 0) {
      this.error = 'Enter a valid amount.';
      return;
    }
    this.runAction('REQUEST_CHANGE', this.counterAmount, this.counterNote || undefined);
  }

  private runAction(action: string, counterAmount?: number, counterNote?: string): void {
    this.submitting = true;
    this.error = null;
    this.shareService.submitInviteeAction(this.token, action, counterAmount, counterNote).subscribe({
      next: updated => {
        this.data = { ...this.data!, status: updated!.status as any };
        this.actionDone = true;
        this.showChangeForm = false;
        this.submitting = false;
      },
      error: err => {
        const msg = err?.error?.error ?? 'Action failed. Please try again.';
        if (msg.includes('not for your account')) {
          this.error = 'This invite was sent to a different email address. Please log in with the correct Google account.';
        } else {
          this.error = msg;
        }
        this.submitting = false;
      }
    });
  }

  onLoginClick(): void {
    localStorage.setItem('postLoginRedirect', `/share/${this.token}`);
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      DENIED: 'Denied',
      CHANGE_REQUESTED: 'Change Requested',
      CHANGE_APPROVED: 'Change Approved',
      CHANGE_REJECTED: 'Change Rejected'
    };
    return labels[status] ?? status;
  }

  statusCssKey(status: string): string {
    return 'status-' + status.toLowerCase().replace(/_/g, '-');
  }
}
