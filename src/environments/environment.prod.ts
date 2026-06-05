export const environment = {
  production: true,
  localDev: false,
  // Nginx serves both frontend and proxies /api → backend on the same origin
  apiUrl: '/api',
  backendUrl: ''
};
