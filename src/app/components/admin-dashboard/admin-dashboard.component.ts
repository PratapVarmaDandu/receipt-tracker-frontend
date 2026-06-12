import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { Organization } from '../../models/organization.model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private readonly source = 'AdminDashboardComponent';

  org: Organization | null = null;
  loading = true;
  error = '';

  editing = false;
  editName = '';
  editSlug = '';
  saving = false;
  editError = '';

  deleting = false;
  publicStoreUpdating = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrganizationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.orgService.getBySlug(slug).subscribe({
      next: org => { this.org = org; this.loading = false; },
      error: err => {
        this.error = err?.error?.error || 'Organization not found.';
        this.loading = false;
        this.logger.error(this.source, 'load failed', err);
      }
    });
  }

  startEdit(): void {
    this.editName = this.org!.name;
    this.editSlug = this.org!.slug;
    this.editError = '';
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    this.editError = '';
  }

  saveEdit(): void {
    if (!this.editName.trim()) { this.editError = 'Name is required.'; return; }
    this.saving = true;
    this.editError = '';
    const oldSlug = this.org!.slug;
    this.orgService.update(oldSlug, { name: this.editName.trim(), slug: this.editSlug.trim() }).subscribe({
      next: updated => {
        this.org = updated;
        this.editing = false;
        this.saving = false;
        // If slug changed, update the URL without a full reload
        if (updated.slug !== oldSlug) {
          this.router.navigate(['/admin/org', updated.slug], { replaceUrl: true });
        }
      },
      error: err => {
        this.editError = err?.error?.error || 'Failed to save changes.';
        this.saving = false;
      }
    });
  }

  deleteOrg(): void {
    if (!confirm(`Permanently delete "${this.org!.name}"? This cannot be undone.`)) return;
    this.deleting = true;
    this.orgService.deleteOrg(this.org!.slug).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: err => {
        this.error = err?.error?.error || 'Failed to delete organization.';
        this.deleting = false;
      }
    });
  }

  togglePublicStore(): void {
    const current = this.org!.publicStore;
    const action = current ? 'make private' : 'make public';
    if (!confirm(`Are you sure you want to ${action} this store? ${current ? 'Members only will be able to browse.' : 'Anyone on the platform can browse and purchase.'}`)) return;
    this.publicStoreUpdating = true;
    this.orgService.setPublicStore(this.org!.slug, !current).subscribe({
      next: updated => { this.org = updated; this.publicStoreUpdating = false; },
      error: err => {
        alert(err?.error?.error || 'Failed to update public store setting.');
        this.publicStoreUpdating = false;
      }
    });
  }

  canManageMembers(): boolean {
    return this.org?.myRole === 'OWNER' || this.org?.myRole === 'ADMIN';
  }

  isOwner(): boolean { return this.org?.myRole === 'OWNER'; }

  goMembers(): void { this.router.navigate(['/admin/org', this.org!.slug, 'members']); }
  goSquare():  void { this.router.navigate(['/admin/org', this.org!.slug, 'square']); }
  goClover():  void { this.router.navigate(['/admin/org', this.org!.slug, 'clover']); }
  goOrders():  void { this.router.navigate(['/admin/org', this.org!.slug, 'orders']); }
  goBack():    void { this.router.navigate(['/admin']); }
}
