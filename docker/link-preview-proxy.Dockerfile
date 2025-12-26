FROM node:20-alpine AS base
WORKDIR /app

# Install only the dependencies we need for the preview proxy
RUN npm install --production link-preview-js express

# Copy the dev proxy script
COPY scripts/dev-link-preview.js ./dev-link-preview.js

ENV PREVIEW_PROXY_HOST=0.0.0.0 \
    PREVIEW_PROXY_PORT=3456 \
    PREVIEW_PROXY_PATH=/preview \
    PREVIEW_PROXY_TIMEOUT_MS=10000

EXPOSE 3456

CMD ["node", "dev-link-preview.js"]
