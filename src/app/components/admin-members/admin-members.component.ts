import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { OrgMember, OrgRole } from '../../models/organization.model';

@Component({
  selector: 'app-admin-members',
  templateUrl: './admin-members.component.html',
  styleUrls: ['./admin-members.component.scss']
})
export class AdminMembersComponent implements OnInit {
  private readonly source = 'AdminMembersComponent';

  slug = '';
  members: OrgMember[] = [];
  loading = true;
  error = '';

  inviteEmail = '';
  inviteRole: OrgRole = 'STAFF';
  inviting = false;
  inviteError = '';
  inviteSuccess = '';

  roles: OrgRole[] = ['ADMIN', 'STAFF', 'VIEWER'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrganizationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug')!;
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading = true;
    this.orgService.listMembers(this.slug).subscribe(members => {
      this.members = members;
      this.loading = false;
    });
  }

  invite(): void {
    if (!this.inviteEmail.trim()) { this.inviteError = 'Email is required.'; return; }
    this.inviting = true;
    this.inviteError = '';
    this.inviteSuccess = '';
    this.orgService.invite(this.slug, { email: this.inviteEmail.trim(), role: this.inviteRole }).subscribe({
      next: m => {
        this.inviting = false;
        this.inviteSuccess = `Invite sent to ${m.inviteEmail}`;
        this.inviteEmail = '';
        this.loadMembers();
      },
      error: err => {
        this.inviting = false;
        this.inviteError = err?.error?.error || 'Failed to send invite.';
        this.logger.error(this.source, 'invite failed', err);
      }
    });
  }

  revoke(member: OrgMember): void {
    if (!confirm(`Revoke access for ${member.inviteEmail}?`)) return;
    this.orgService.revoke(this.slug, member.id).subscribe({
      next: () => this.loadMembers(),
      error: err => {
        this.error = err?.error?.error || 'Failed to revoke member.';
        this.logger.error(this.source, 'revoke failed', err);
      }
    });
  }

  goBack(): void { this.router.navigate(['/admin/org', this.slug]); }

  statusClass(status: string): string {
    return { ACTIVE: 'status-active', PENDING: 'status-pending', REVOKED: 'status-revoked' }[status] || '';
  }
}
