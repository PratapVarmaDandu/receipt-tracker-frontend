// NR config is injected at container start via window.__NR_CONFIG__ (see nr-config.js.template).
// These values are only used as a local-dev fallback — leave licenseKey empty so the agent
// stays disabled unless the key is explicitly provided.
const nrBrowser = {
  accountId: '8142327',
  licenseKey: '',
  applicationId: '653421046',
  agentId: '653421046',
  trustKey: '8142327'
};

export const environment = {
  production: true,
  localDev: false,
  apiUrl: 'https://api.secure-steward.com/api',
  backendUrl: 'https://api.secure-steward.com',
  newrelic: {
    ...nrBrowser,
    enabled: !!(nrBrowser.licenseKey && nrBrowser.applicationId)
  }
};
