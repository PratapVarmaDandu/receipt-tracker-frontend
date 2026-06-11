import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '../../services/platform.service';
import { LoggerService } from '../../services/logger.service';
import { Organization } from '../../models/organization.model';
import { PlatformStats } from '../../models/platform.model';

@Component({
  selector: 'app-platform',
  templateUrl: './platform.component.html',
  styleUrls: ['./platform.component.scss']
})
export class PlatformComponent implements OnInit {
  private readonly source = 'PlatformComponent';

  orgs: Organization[] = [];
  stats: PlatformStats | null = null;
  loading = true;
  error = '';
  actionInProgress: { [slug: string]: boolean } = {};

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

  viewOrg(slug: string): void {
    this.router.navigate(['/admin/org', slug]);
  }
}
