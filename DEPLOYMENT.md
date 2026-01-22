# Deployment Guide

This guide covers deploying Hive Community to production using Fly.io.

## Prerequisites

- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account
- All external services configured (see below)

## Required External Services

### 1. Database (Neon Postgres)

1. Create a database at [neon.tech](https://neon.tech)
2. Get your connection strings:
   - **DATABASE_URL**: Pooled connection (with `?pgbouncer=true`)
   - **DIRECT_URL**: Direct connection (for migrations)

### 2. Email (Resend)

1. Create an account at [resend.com](https://resend.com)
2. Verify your domain
3. Get your API key
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

### 3. Rate Limiting (Upstash Redis)

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Get your REST URL and token
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 4. Real-time Communication (Ably)

1. Create an account at [ably.com](https://ably.com)
2. Create a new app
3. Get your API key from the "API Keys" tab
4. Set `ABLY_API_KEY`

**Ably Channel Structure:**
- `chat:{communityId}:{channelId}` - Chat messages
- `forum:{communityId}` - Forum notifications (new posts, comments)

**Required Ably Capabilities:**
- `subscribe` - For receiving messages
- `publish` - For sending messages (server-side)
- `presence` - For online user indicators

### 5. Error Monitoring (Sentry)

1. Create a project at [sentry.io](https://sentry.io)
2. Get your DSN and auth token
3. Set:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`

## Deployment Steps

### 1. Initial Setup

```bash
# Login to Fly.io
fly auth login

# Launch the app (first time only)
fly launch --no-deploy
```

### 2. Set Secrets

```bash
# Database
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set DIRECT_URL="postgresql://..."

# Auth
fly secrets set NEXTAUTH_URL="https://your-app.fly.dev"
fly secrets set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Email
fly secrets set RESEND_API_KEY="re_..."
fly secrets set RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Redis
fly secrets set UPSTASH_REDIS_REST_URL="https://..."
fly secrets set UPSTASH_REDIS_REST_TOKEN="..."

# Ably
fly secrets set ABLY_API_KEY="..."

# Sentry
fly secrets set NEXT_PUBLIC_SENTRY_DSN="https://..."
fly secrets set SENTRY_AUTH_TOKEN="..."
fly secrets set SENTRY_ORG="..."
fly secrets set SENTRY_PROJECT="..."
```

### 3. Run Database Migrations

```bash
# Connect to the app and run migrations
fly ssh console
cd /app
npx prisma migrate deploy
exit
```

### 4. Deploy

```bash
fly deploy
```

### 5. Verify Deployment

```bash
# Check app status
fly status

# View logs
fly logs

# Open the app
fly open
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled Postgres connection string |
| `DIRECT_URL` | Yes | Direct Postgres connection string |
| `NEXTAUTH_URL` | Yes | Production URL |
| `NEXTAUTH_SECRET` | Yes | Auth secret (32+ chars) |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | Sender email address |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `ABLY_API_KEY` | Yes | Ably API key |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token |
| `SENTRY_ORG` | No | Sentry organization |
| `SENTRY_PROJECT` | No | Sentry project name |

## Scaling

```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 1024
```

## Monitoring

- **Health Check**: `GET /api/health`
- **Sentry Dashboard**: View errors at sentry.io
- **Fly.io Dashboard**: View metrics at fly.io/dashboard

## Troubleshooting

### App won't start
```bash
fly logs --app your-app-name
```

### Database connection issues
- Verify DATABASE_URL is using pooled connection
- Check Neon dashboard for connection limits

### Real-time features not working
- Verify ABLY_API_KEY is set correctly
- Check Ably dashboard for connection errors
- Ensure CSP allows Ably domains

### Rate limiting not working
- Verify Upstash credentials
- Check Redis dashboard for connection issues
