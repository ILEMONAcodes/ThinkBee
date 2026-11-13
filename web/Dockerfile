FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME="Think Bee"
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_AUTH_REDIRECT_URL
ARG NEXT_PUBLIC_AUTH_REQUIRE_EMAIL_CONFIRMATION=false
ARG NEXT_PUBLIC_ACCOUNT_TIMEOUT_SECONDS=90
ARG NEXT_PUBLIC_ONBOARDING_MAX_UNITS=200
ARG NEXT_PUBLIC_APP_LOCK_IDLE_MINUTES=5
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
