import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// New Relic Browser Agent init.
// In production the config is injected at container start via /nr-config.js → window.__NR_CONFIG__.
// In local dev, falls back to environment.newrelic (disabled by default).
const nrCfg = (window as any).__NR_CONFIG__ || (environment.newrelic.enabled ? environment.newrelic : null);
if (nrCfg?.licenseKey) {
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
        licenseKey: nrCfg.licenseKey,
        applicationID: nrCfg.applicationId,
        sa: 1
      },
      loader_config: {
        accountID: nrCfg.accountId,
        trustKey: nrCfg.trustKey,
        agentID: nrCfg.agentId,
        licenseKey: nrCfg.licenseKey,
        applicationID: nrCfg.applicationId
      }
    });
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
