import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Initialize New Relic Browser Agent before Angular bootstraps.
// Uses dynamic import so the NR bundle is excluded from the main chunk when disabled.
if (environment.newrelic.enabled) {
  import('@newrelic/browser-agent/loaders/browser-agent').then(({ BrowserAgent }) => {
    new BrowserAgent({
      init: {
        distributed_tracing: { enabled: true },
        privacy: { cookies_enabled: true },
        ajax: { deny_list: ['bam.nr-data.net'] },
        browser_consent_mode: { enabled: false },
        performance: { capture_detail: false, capture_marks: false, capture_measures: true }
      },
      info: {
        beacon: 'bam.nr-data.net',
        errorBeacon: 'bam.nr-data.net',
        licenseKey: environment.newrelic.licenseKey,
        applicationID: environment.newrelic.applicationId,
        sa: 1
      },
      loader_config: {
        accountID: environment.newrelic.accountId,
        trustKey: environment.newrelic.trustKey,
        agentID: environment.newrelic.agentId,
        licenseKey: environment.newrelic.licenseKey,
        applicationID: environment.newrelic.applicationId
      }
    });
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
