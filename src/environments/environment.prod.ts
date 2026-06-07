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
  // Nginx serves both frontend and proxies /api → backend on the same origin
  apiUrl: '/api',
  backendUrl: '',
  newrelic: {
    ...nrBrowser,
    // Automatically enabled when licenseKey and applicationId are filled in
    enabled: !!(nrBrowser.licenseKey && nrBrowser.applicationId)
  }
};
