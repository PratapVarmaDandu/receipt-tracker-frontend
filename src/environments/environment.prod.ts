// New Relic Browser Agent config — fill in values from:
//   New Relic UI → Add Data → Browser → (your app) → Application settings
// Set these before running  npm run build  for production, or inject via
// your CI/CD pipeline. Agent is automatically disabled when licenseKey is empty.
const nrBrowser = {
  accountId: '',       // NR account ID (numeric, from URL or app settings)
  licenseKey: '',      // Browser ingest key (starts with "NRBR-...")
  applicationId: '',   // Browser application ID (numeric)
  agentId: '',         // Same as applicationId in most setups
  trustKey: ''         // Same as accountId for single-account orgs
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
