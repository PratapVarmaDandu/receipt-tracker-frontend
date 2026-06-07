#!/bin/sh
# Inject the New Relic license key at container start.
# NR_LICENSE_KEY comes from docker-compose environment (sourced from .env on the host).
# If unset the agent stays disabled (licenseKey empty → main.ts skips init).
NR_KEY="${NR_LICENSE_KEY:-}"
sed "s|__NR_LICENSE_KEY__|${NR_KEY}|g" \
  /templates/nr-config.js.template \
  > /usr/share/nginx/html/nr-config.js
exec nginx -g "daemon off;"
