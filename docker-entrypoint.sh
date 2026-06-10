#!/bin/sh
# Inject the New Relic license key at container start.
NR_KEY="${NR_BROWSER_LICENSE_KEY:-}"
sed "s|__NR_LICENSE_KEY__|${NR_KEY}|g" \
  /templates/nr-config.js.template \
  > /usr/share/nginx/html/nr-config.js

# Inject the Square Web Payments SDK URL based on environment.
# SQUARE_ENVIRONMENT=production  → production CDN
# anything else (sandbox/unset)  → sandbox CDN
if [ "${SQUARE_ENVIRONMENT:-sandbox}" = "production" ]; then
  SQUARE_SDK_URL="https://web.squarecdn.com/v1/square.js"
else
  SQUARE_SDK_URL="https://sandbox.web.squarecdn.com/v1/square.js"
fi
sed -i "s|__SQUARE_SDK_URL__|${SQUARE_SDK_URL}|g" \
  /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"
