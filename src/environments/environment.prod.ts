const nrBrowser = {
  accountId: '8142327',
  licenseKey: '__NR_LICENSE_KEY__',  // injected at Docker build time via ARG — never commit the real key
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
