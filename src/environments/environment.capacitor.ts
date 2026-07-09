// Used only when building the Capacitor (iOS/Android) native shell — `npm run build:capacitor`.
// Unlike environment.prod.ts, the native app has no same-origin nginx proxy to piggyback on,
// so apiUrl/backendUrl must be an absolute URL to your deployed backend.
// Oracle VM deployment (138.2.208.79) — FRONTEND_URL in /opt/expense-app/.env on the VM.
export const environment = {
  production: true,
  localDev: false,
  capacitor: true,
  apiUrl: 'https://secure-steward.com/api',
  backendUrl: 'https://secure-steward.com',
  newrelic: {
    enabled: false,
    accountId: '',
    licenseKey: '',
    applicationId: '',
    agentId: '',
    trustKey: ''
  }
};
