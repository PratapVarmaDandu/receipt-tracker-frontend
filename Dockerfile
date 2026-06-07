# ── Stage 1: Build Angular app ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine
# Injected at build time: docker compose build --build-arg NR_LICENSE_KEY=NRJS-...
# The real key is never committed — only the placeholder __NR_LICENSE_KEY__ lives in source.
ARG NR_LICENSE_KEY=
COPY --from=build /app/dist/receipt-tracker-frontend/browser /usr/share/nginx/html
# Replace the placeholder in the compiled JS bundle with the real key (if provided)
RUN if [ -n "$NR_LICENSE_KEY" ]; then \
      find /usr/share/nginx/html -name "*.js" \
        -exec sed -i "s|__NR_LICENSE_KEY__|${NR_LICENSE_KEY}|g" {} +; \
    fi
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
