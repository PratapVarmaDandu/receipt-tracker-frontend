import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-admin-register',
  templateUrl: './admin-register.component.html',
  styleUrls: ['./admin-register.component.scss']
})
export class AdminRegisterComponent {
  private readonly source = 'AdminRegisterComponent';

  name = '';
  slug = '';
  slugEdited = false;
  submitting = false;
  error = '';

  constructor(
    private orgService: OrganizationService,
    private router: Router,
    private logger: LoggerService
  ) {}

  onNameChange(): void {
    if (!this.slugEdited) {
      this.slug = this.name.trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
  }

  onSlugChange(): void {
    this.slugEdited = true;
    this.slug = this.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  submit(): void {
    if (!this.name.trim()) { this.error = 'Business name is required.'; return; }
    if (!this.slug.trim()) { this.error = 'URL slug is required.'; return; }
    this.submitting = true;
    this.error = '';
    this.orgService.create({ name: this.name.trim(), slug: this.slug.trim() }).subscribe({
      next: org => {
        this.submitting = false;
        this.router.navigate(['/admin/org', org.slug]);
      },
      error: err => {
        this.submitting = false;
        this.error = err?.error?.error || 'Failed to register business.';
        this.logger.error(this.source, 'create failed', err);
      }
    });
  }

  cancel(): void { this.router.navigate(['/admin']); }
}
