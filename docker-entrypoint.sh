#!/bin/sh
# Inject the New Relic license key at container start.
NR_KEY="${NR_BROWSER_LICENSE_KEY:-}"
sed "s|__NR_LICENSE_KEY__|${NR_KEY}|g" \
  /templates/nr-config.js.template \
  > /usr/share/nginx/html/nr-config.js

exec nginx -g "daemon off;"
