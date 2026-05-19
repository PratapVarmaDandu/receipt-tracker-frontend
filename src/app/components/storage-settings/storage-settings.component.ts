import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { StorageConfig, StorageTestResult, StorageType, StorageUsage } from '../../models/storage-config.model';
import { StorageService } from '../../services/storage.service';
import { UiEventsService } from '../../services/ui-events.service';

@Component({
  selector: 'app-storage-settings',
  templateUrl: './storage-settings.component.html',
  styleUrls: ['./storage-settings.component.scss']
})
export class StorageSettingsComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  testing = false;
  saveSuccess = false;
  saveError = '';
  testResult: StorageTestResult | null = null;
  showSecretKey = false;
  currentConfig: StorageConfig | null = null;
  usage: StorageUsage | null = null;
  loadingUsage = false;
  defaultStoragePath = '';

  readonly awsRegions = [
    { value: 'us-east-1',      label: 'US East (N. Virginia)' },
    { value: 'us-east-2',      label: 'US East (Ohio)' },
    { value: 'us-west-1',      label: 'US West (N. California)' },
    { value: 'us-west-2',      label: 'US West (Oregon)' },
    { value: 'ca-central-1',   label: 'Canada (Central)' },
    { value: 'eu-west-1',      label: 'Europe (Ireland)' },
    { value: 'eu-west-2',      label: 'Europe (London)' },
    { value: 'eu-west-3',      label: 'Europe (Paris)' },
    { value: 'eu-central-1',   label: 'Europe (Frankfurt)' },
    { value: 'eu-north-1',     label: 'Europe (Stockholm)' },
    { value: 'ap-south-1',     label: 'Asia Pacific (Mumbai)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'sa-east-1',      label: 'South America (São Paulo)' },
  ];

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,
    private uiEvents: UiEventsService
  ) {
    this.form = this.fb.group({
      storageType:       ['LOCAL'],
      localStoragePath:  [''],
      s3BucketName:      [''],
      s3Region:          ['us-east-1'],
      s3AccessKeyId:     [''],
      s3SecretAccessKey: ['']
    });
  }

  ngOnInit(): void {
    this.storageService.getConfig().subscribe({
      next: (config) => {
        this.currentConfig = config;
        this.defaultStoragePath = config.defaultStoragePath || '';
        this.form.patchValue({
          storageType:       config.storageType      || 'LOCAL',
          localStoragePath:  config.localStoragePath || '',
          s3BucketName:      config.s3BucketName     || '',
          s3Region:          config.s3Region         || 'us-east-1',
          s3AccessKeyId:     config.s3AccessKeyId    || '',
          s3SecretAccessKey: ''
        });
        this.loading = false;
        this.loadUsage();
      },
      error: () => { this.loading = false; }
    });
  }

  loadUsage(): void {
    this.loadingUsage = true;
    this.storageService.getUsage().subscribe({
      next: (u) => { this.usage = u; this.loadingUsage = false; },
      error: () => { this.loadingUsage = false; }
    });
  }

  get storageType(): StorageType {
    return this.form.get('storageType')?.value;
  }

  setType(type: StorageType): void {
    this.form.patchValue({ storageType: type });
    this.testResult = null;
    this.saveSuccess = false;
  }

  testConnection(): void {
    this.testing = true;
    this.testResult = null;
    this.storageService.testConnection(this.buildConfig()).subscribe({
      next: (result) => { this.testResult = result; this.testing = false; },
      error: () => {
        this.testResult = { success: false, message: 'Connection test request failed' };
        this.testing = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.saveError = '';
    this.saveSuccess = false;
    this.storageService.saveConfig(this.buildConfig()).subscribe({
      next: (saved) => {
        this.currentConfig = saved;
        this.saveSuccess = true;
        this.saving = false;
        this.form.patchValue({ s3SecretAccessKey: '' });
        this.loadUsage();
      },
      error: () => {
        this.saveError = 'Failed to save configuration. Please try again.';
        this.saving = false;
      }
    });
  }

  showInfo(): void {
    this.uiEvents.openWelcomeBanner();
  }

  private buildConfig(): StorageConfig {
    const val = this.form.value;
    return {
      storageType:           val.storageType,
      localStoragePath:      val.localStoragePath  || null,
      s3BucketName:          val.s3BucketName      || null,
      s3Region:              val.s3Region          || null,
      s3AccessKeyId:         val.s3AccessKeyId     || null,
      s3SecretAccessKey:     val.s3SecretAccessKey || null,
      storageConfigured:     true,
      s3SecretKeyConfigured: this.currentConfig?.s3SecretKeyConfigured ?? false
    };
  }
}
