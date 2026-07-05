import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '../../services/platform.service';
import { LoggerService } from '../../services/logger.service';
import { Organization } from '../../models/organization.model';
import { PlatformStats, PlatformUser, PlatformSubmission, APP_FEATURES } from '../../models/platform.model';

@Component({
  selector: 'app-platform',
  templateUrl: './platform.component.html',
  styleUrls: ['./platform.component.scss']
})
export class PlatformComponent implements OnInit {
  private readonly source = 'PlatformComponent';

  activeTab: 'orgs' | 'users' | 'feedback' = 'orgs';

  orgs: Organization[] = [];
  stats: PlatformStats | null = null;
  loading = true;
  error = '';
  actionInProgress: { [slug: string]: boolean } = {};

  appFeatures = APP_FEATURES;
  expandedOrg: string | null = null;
  featureInProgress: { [key: string]: boolean } = {};

  // Users tab
  users: PlatformUser[] = [];
  usersLoading = false;
  usersLoaded = false;
  usersError = '';
  expandedUserId: number | null = null;
  userFeatureInProgress: { [key: string]: boolean } = {};

  /** Personal features only — SHOP_POS stays org-scoped */
  readonly userFeatures = APP_FEATURES.filter(f => f.key !== 'SHOP_POS');

  // Feedback tab
  submissions: PlatformSubmission[] = [];
  feedbackLoading = false;
  feedbackLoaded = false;
  feedbackError = '';
  feedbackTypeFilter = '';
  feedbackStatusFilter = '';
  expandedSubmissionId: number | null = null;
  statusInProgress: { [id: number]: boolean } = {};
  rewardInProgress: { [id: number]: boolean } = {};
  rewardFeature: { [id: number]: string } = {};
  rewardMonths: { [id: number]: number } = {};
  rewardError: { [id: number]: string } = {};

  constructor(
    private platformService: PlatformService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.platformService.getStats().subscribe(stats => { this.stats = stats; });
    this.platformService.listAllOrgs().subscribe({
      next: orgs => { this.orgs = orgs; this.loading = false; },
      error: err => {
        this.error = err?.error?.error || 'Failed to load organizations.';
        this.loading = false;
        this.logger.error(this.source, 'load failed', err);
      }
    });
  }

  toggleStatus(org: Organization): void {
    const newStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const label = newStatus === 'SUSPENDED' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${label} "${org.name}"?`)) return;

    this.actionInProgress[org.slug] = true;
    this.platformService.setOrgStatus(org.slug, newStatus).subscribe({
      next: updated => {
        const idx = this.orgs.findIndex(o => o.slug === org.slug);
        if (idx !== -1) this.orgs[idx] = updated;
        this.actionInProgress[org.slug] = false;
      },
      error: err => {
        alert(err?.error?.error || `Failed to ${label} org.`);
        this.actionInProgress[org.slug] = false;
      }
    });
  }

  togglePlan(org: Organization): void {
    const newPlan = org.plan === 'FREE' ? 'PRO' : 'FREE';
    this.actionInProgress[org.slug] = true;
    this.platformService.setOrgPlan(org.slug, newPlan).subscribe({
      next: updated => {
        const idx = this.orgs.findIndex(o => o.slug === org.slug);
        if (idx !== -1) this.orgs[idx] = updated;
        this.actionInProgress[org.slug] = false;
      },
      error: err => {
        alert(err?.error?.error || 'Failed to change plan.');
        this.actionInProgress[org.slug] = false;
      }
    });
  }

  switchTab(tab: 'orgs' | 'users' | 'feedback'): void {
    this.activeTab = tab;
    if (tab === 'users' && !this.usersLoaded) this.loadUsers();
    if (tab === 'feedback' && !this.feedbackLoaded) this.loadFeedback();
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';
    this.platformService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.usersLoading = false;
        this.usersLoaded = true;
      },
      error: err => {
        this.usersError = err?.error?.error || 'Failed to load users.';
        this.usersLoading = false;
        this.logger.error(this.source, 'loadUsers failed', err);
      }
    });
  }

  toggleUserExpand(user: PlatformUser): void {
    this.expandedUserId = this.expandedUserId === user.id ? null : user.id;
  }

  userHasFeature(user: PlatformUser, feature: string): boolean {
    return user.features.includes(feature);
  }

  toggleUserFeature(user: PlatformUser, feature: string): void {
    const key = `${user.id}:${feature}`;
    if (this.userFeatureInProgress[key]) return;
    this.userFeatureInProgress[key] = true;

    const call = this.userHasFeature(user, feature)
      ? this.platformService.revokeUserFeature(user.id, feature)
      : this.platformService.grantUserFeature(user.id, feature);

    call.subscribe({
      next: res => {
        user.features = res.features;
        this.userFeatureInProgress[key] = false;
      },
      error: err => {
        alert(err?.error?.error || 'Failed to update feature.');
        this.userFeatureInProgress[key] = false;
        this.logger.error(this.source, 'toggleUserFeature failed', err);
      }
    });
  }

  viewOrg(slug: string): void {
    this.router.navigate(['/admin/org', slug]);
  }

  toggleExpand(org: Organization): void {
    this.expandedOrg = this.expandedOrg === org.slug ? null : org.slug;
  }

  orgHasFeature(org: Organization, feature: string): boolean {
    return !!org.features && org.features.includes(feature);
  }

  toggleFeature(org: Organization, feature: string): void {
    const key = `${org.slug}:${feature}`;
    if (this.featureInProgress[key]) return;
    this.featureInProgress[key] = true;

    const call = this.orgHasFeature(org, feature)
      ? this.platformService.revokeFeature(org.slug, feature)
      : this.platformService.grantFeature(org.slug, feature);

    call.subscribe({
      next: features => {
        org.features = features;
        this.featureInProgress[key] = false;
        this.platformService.getStats().subscribe(stats => { this.stats = stats; });
      },
      error: err => {
        alert(err?.error?.error || 'Failed to update feature.');
        this.featureInProgress[key] = false;
        this.logger.error(this.source, 'toggleFeature failed', err);
      }
    });
  }

  // ── Feedback / bug / idea review console ─────────────────────────────────

  loadFeedback(): void {
    this.feedbackLoading = true;
    this.feedbackError = '';
    this.platformService.listFeedback(this.feedbackTypeFilter, this.feedbackStatusFilter).subscribe({
      next: submissions => {
        this.submissions = submissions;
        this.feedbackLoading = false;
        this.feedbackLoaded = true;
      },
      error: err => {
        this.feedbackError = err?.error?.error || 'Failed to load submissions.';
        this.feedbackLoading = false;
        this.logger.error(this.source, 'loadFeedback failed', err);
      }
    });
  }

  toggleSubmissionExpand(submission: PlatformSubmission): void {
    this.expandedSubmissionId = this.expandedSubmissionId === submission.id ? null : submission.id;
    if (!this.rewardFeature[submission.id]) this.rewardFeature[submission.id] = this.userFeatures[0].key;
    if (!this.rewardMonths[submission.id]) this.rewardMonths[submission.id] = 1;
  }

  isImageAttachment(submission: PlatformSubmission): boolean {
    return !!submission.attachmentMimeType && submission.attachmentMimeType.startsWith('image/');
  }

  attachmentUrl(submission: PlatformSubmission): string {
    return this.platformService.feedbackAttachmentUrl(submission.id);
  }

  updateSubmissionStatus(submission: PlatformSubmission, status: string): void {
    if (this.statusInProgress[submission.id]) return;
    this.statusInProgress[submission.id] = true;
    this.platformService.updateFeedbackStatus(submission.id, status).subscribe({
      next: updated => {
        const idx = this.submissions.findIndex(s => s.id === submission.id);
        if (idx !== -1) this.submissions[idx] = updated;
        this.statusInProgress[submission.id] = false;
      },
      error: err => {
        alert(err?.error?.error || 'Failed to update status.');
        this.statusInProgress[submission.id] = false;
        this.logger.error(this.source, 'updateSubmissionStatus failed', err);
      }
    });
  }

  submitReward(submission: PlatformSubmission): void {
    if (this.rewardInProgress[submission.id]) return;
    this.rewardInProgress[submission.id] = true;
    this.rewardError[submission.id] = '';
    const feature = this.rewardFeature[submission.id];
    const months = this.rewardMonths[submission.id] || 1;
    this.platformService.grantFeedbackReward(submission.id, feature, months).subscribe({
      next: () => {
        submission.rewardGranted = true;
        this.rewardInProgress[submission.id] = false;
      },
      error: err => {
        this.rewardError[submission.id] = err?.error?.error || 'Failed to grant reward.';
        this.rewardInProgress[submission.id] = false;
        this.logger.error(this.source, 'submitReward failed', err);
      }
    });
  }
}
