import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { OrgCloverConfig, OrgCloverConfigRequest } from '../../models/organization.model';

@Component({
  selector: 'app-admin-clover',
  templateUrl: './admin-clover.component.html',
  styleUrls: ['./admin-clover.component.scss']
})
export class AdminCloverComponent implements OnInit {
  private readonly source = 'AdminCloverComponent';

  slug = '';
  config: OrgCloverConfig | null = null;
  loading = true;
  saving = false;
  testing = false;
  clearing = false;

  form: OrgCloverConfigRequest = {
    accessToken: '',
    merchantId: '',
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
    this.loadConfig();
  }

  loadConfig(): void {
    this.loading = true;
    this.orgService.getCloverConfig(this.slug).subscribe({
      next: cfg => { this.config = cfg; this.loading = false; },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to load Clover configuration.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.form.accessToken.trim() || !this.form.merchantId.trim()) {
      this.errorMsg = 'Access token and Merchant ID are required.';
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';
    this.testResult = null;

    this.orgService.saveCloverConfig(this.slug, this.form).subscribe({
      next: cfg => {
        this.config = cfg;
        this.saving = false;
        this.successMsg = 'Clover configuration saved successfully.';
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

    this.orgService.testCloverConnection(this.slug).subscribe({
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
    if (!confirm('Remove Clover configuration for this organization?')) return;
    this.clearing = true;
    this.orgService.clearCloverConfig(this.slug).subscribe({
      next: () => {
        this.config = null;
        this.clearing = false;
        this.successMsg = 'Clover configuration removed.';
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
