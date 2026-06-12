import { Component, OnInit } from '@angular/core';
import { PlatformService } from '../../services/platform.service';
import { LoggerService } from '../../services/logger.service';
import { PlatformSquareConfig, PlatformSquareConfigRequest } from '../../models/platform.model';

@Component({
  selector: 'app-platform-square-config',
  templateUrl: './platform-square-config.component.html',
  styleUrls: ['./platform-square-config.component.scss']
})
export class PlatformSquareConfigComponent implements OnInit {
  private readonly source = 'PlatformSquareConfigComponent';

  config: PlatformSquareConfig | null = null;
  loading = true;
  saving = false;
  testing = false;
  error = '';
  successMessage = '';
  testResult: { success: boolean; message: string } | null = null;

  // Form fields
  accessToken = '';
  applicationId = '';
  locationId = '';
  webhookSignatureKey = '';
  environment: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX';
  planIdGarage = '';
  planIdVault = '';
  planIdJobs = '';
  planIdSuite = '';

  showToken = false;
  showWebhookKey = false;

  constructor(
    private platformService: PlatformService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.platformService.getPlatformSquareConfig().subscribe({
      next: cfg => {
        this.config = cfg;
        this.applicationId = cfg.applicationId || '';
        this.locationId = cfg.locationId || '';
        this.environment = (cfg.environment as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX';
        this.planIdGarage = cfg.planIdGarage || '';
        this.planIdVault  = cfg.planIdVault  || '';
        this.planIdJobs   = cfg.planIdJobs   || '';
        this.planIdSuite  = cfg.planIdSuite  || '';
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to load configuration.';
        this.loading = false;
        this.logger.error(this.source, 'load failed', err);
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';
    this.successMessage = '';
    this.testResult = null;

    const req: PlatformSquareConfigRequest = {
      applicationId: this.applicationId.trim() || undefined,
      locationId: this.locationId.trim() || undefined,
      environment: this.environment,
      planIdGarage: this.planIdGarage.trim() || undefined,
      planIdVault:  this.planIdVault.trim()  || undefined,
      planIdJobs:   this.planIdJobs.trim()   || undefined,
      planIdSuite:  this.planIdSuite.trim()  || undefined
    };
    if (this.accessToken.trim())        req.accessToken        = this.accessToken.trim();
    if (this.webhookSignatureKey.trim()) req.webhookSignatureKey = this.webhookSignatureKey.trim();

    this.platformService.savePlatformSquareConfig(req).subscribe({
      next: cfg => {
        this.config = cfg;
        this.accessToken = '';
        this.webhookSignatureKey = '';
        this.successMessage = 'Configuration saved.';
        this.saving = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to save configuration.';
        this.saving = false;
        this.logger.error(this.source, 'save failed', err);
      }
    });
  }

  testConnection(): void {
    this.testing = true;
    this.testResult = null;
    this.error = '';
    this.platformService.testPlatformSquareConnection().subscribe({
      next: result => {
        this.testResult = result;
        this.testing = false;
      },
      error: err => {
        this.testResult = { success: false, message: err?.error?.error || 'Connection test failed.' };
        this.testing = false;
      }
    });
  }

  clearConfig(): void {
    if (!confirm('Clear all platform Square credentials? This will break the /plans subscription flow until reconfigured.')) return;
    this.platformService.clearPlatformSquareConfig().subscribe({
      next: () => {
        this.successMessage = 'Configuration cleared.';
        this.load();
      },
      error: err => {
        this.error = err?.error?.error || 'Failed to clear configuration.';
        this.logger.error(this.source, 'clearConfig failed', err);
      }
    });
  }
}
