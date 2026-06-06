export const environment = {
  production: false,
  localDev: true,
  apiUrl: 'http://localhost:8080/api',
  backendUrl: 'http://localhost:8080',
  newrelic: {
    // Browser agent disabled in local dev — no data sent to New Relic
    enabled: false,
    accountId: '',
    licenseKey: '',
    applicationId: '',
    agentId: '',
    trustKey: ''
  }
};
