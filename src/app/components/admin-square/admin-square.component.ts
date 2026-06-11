import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { OrgSquareConfig, OrgSquareConfigRequest, OrgRole } from '../../models/organization.model';

@Component({
  selector: 'app-admin-square',
  templateUrl: './admin-square.component.html',
  styleUrls: ['./admin-square.component.scss']
})
export class AdminSquareComponent implements OnInit {
  private readonly source = 'AdminSquareComponent';

  slug = '';
  myRole: OrgRole | null = null;
  config: OrgSquareConfig | null = null;
  loading = true;
  saving = false;
  testing = false;
  clearing = false;

  form: OrgSquareConfigRequest = {
    accessToken: '',
    applicationId: '',
    locationId: '',
    environment: 'SANDBOX'
  };

  testResult: { success: boolean; message: string } | null = null;
  successMsg = '';
  errorMsg = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrganizationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug')!;
    // myRole is passed via route data or parent component if needed;
    // for now we show all controls and let the backend enforce role gates
    this.loadConfig();
  }

  loadConfig(): void {
    this.loading = true;
    this.orgService.getSquareConfig(this.slug).subscribe({
      next: cfg => { this.config = cfg; this.loading = false; },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to load Square configuration.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.form.accessToken.trim() || !this.form.applicationId.trim() || !this.form.locationId.trim()) {
      this.errorMsg = 'All fields are required.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.testResult = null;

    this.orgService.saveSquareConfig(this.slug, this.form).subscribe({
      next: cfg => {
        this.config = cfg;
        this.saving = false;
        this.successMsg = 'Square configuration saved successfully.';
        this.form.accessToken = '';
      },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to save configuration.';
        this.saving = false;
      }
    });
  }

  testConnection(): void {
    this.testing = true;
    this.testResult = null;
    this.errorMsg = '';

    this.orgService.testSquareConnection(this.slug).subscribe({
      next: res => {
        this.testResult = { success: res.success, message: res.message || 'Connection successful' };
        this.testing = false;
      },
      error: err => {
        this.testResult = { success: false, message: err?.error?.error || 'Connection failed' };
        this.testing = false;
      }
    });
  }

  clearConfig(): void {
    if (!confirm('Remove Square configuration for this organization?')) return;
    this.clearing = true;
    this.orgService.clearSquareConfig(this.slug).subscribe({
      next: () => {
        this.config = null;
        this.clearing = false;
        this.successMsg = 'Square configuration removed.';
        this.testResult = null;
      },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to remove configuration.';
        this.clearing = false;
      }
    });
  }

  goBack(): void { this.router.navigate(['/admin/org', this.slug]); }

  get canClear(): boolean { return !!this.config?.configured; }
  get canTest():  boolean { return !!this.config?.configured; }
}
