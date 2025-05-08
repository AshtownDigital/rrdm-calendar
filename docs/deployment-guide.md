# RRDM Application Deployment Guide

This guide provides instructions for deploying the RRDM application to Vercel, including configuration for the Neon PostgreSQL database and Redis.

## Prerequisites

Before deploying, make sure you have:

1. A [Vercel](https://vercel.com) account
2. A [Neon PostgreSQL](https://neon.tech) database (or another PostgreSQL provider)
3. A Redis instance (optional, but recommended for production)
4. The Vercel CLI installed (`npm install -g vercel`)

## Environment Variables

The following environment variables need to be configured in your Vercel project:

### Database Configuration
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `PRISMA_CLIENT_ENGINE_TYPE`: Set to `dataproxy` for Vercel serverless environment

### Redis Configuration
- `REDIS_ENABLED`: Set to `true` to enable Redis (recommended for production)
- `REDIS_MOCK`: Set to `false` in production
- `REDIS_URL`: Your Redis connection string (if using an external Redis provider)

### Session Configuration
- `SESSION_SECRET`: A secure random string for session encryption
- `SESSION_PERSISTENCE`: Set to `true` to enable persistent sessions

### Security Configuration
- `RATE_LIMIT_ENABLED`: Set to `true` to enable rate limiting
- `RATE_LIMIT_MAX`: Maximum number of requests per window (default: 100)
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds (default: 60000)

## Deployment Steps

### 1. Prepare Your Application

Ensure your application is ready for deployment:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application (if needed)
npm run build
```

### 2. Configure Vercel

The `vercel.json` file should already be configured with the necessary settings:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/_vercel/health",
      "dest": "/api/_vercel/health.js",
      "methods": ["GET"]
    },
    { 
      "src": "/assets/(.*)", 
      "dest": "/public/assets/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { 
      "src": "/scripts/(.*)", 
      "dest": "/public/scripts/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { 
      "src": "/stylesheets/(.*)", 
      "dest": "/public/stylesheets/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { "src": "/debug", "dest": "/server.js" },
    { "src": "/(.*)", "dest": "/server.js" }
  ],
  "env": {
    "NODE_ENV": "production",
    "VERCEL": "1",
    "SESSION_PERSISTENCE": "true",
    "PRISMA_CLIENT_ENGINE_TYPE": "dataproxy",
    "REDIS_ENABLED": "true",
    "REDIS_MOCK": "false",
    "RATE_LIMIT_ENABLED": "true"
  }
}
```

### 3. Set Up Neon PostgreSQL

1. Create a new database in your Neon PostgreSQL project
2. Get the connection string from the Neon dashboard
3. Set the `DATABASE_URL` environment variable in Vercel

### 4. Set Up Redis (Optional but Recommended)

For production deployments, it's recommended to use a managed Redis service:

1. Create a Redis instance using a provider like Upstash, Redis Labs, or AWS ElastiCache
2. Get the connection string
3. Set the `REDIS_URL` environment variable in Vercel

### 5. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy the application
vercel --prod
```

Alternatively, you can connect your GitHub repository to Vercel for automatic deployments.

## Post-Deployment Verification

After deployment, verify that:

1. The application is accessible at your Vercel URL
2. Database connections are working correctly
3. Redis operations are functioning (if enabled)
4. Sessions are persisting correctly
5. Rate limiting is working as expected

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your `DATABASE_URL` is correct
2. Ensure your Neon PostgreSQL database is accessible from Vercel
3. Check that the Prisma schema matches your database structure

### Redis Connection Issues

If Redis operations are failing:

1. Verify your `REDIS_URL` is correct
2. Ensure Redis is accessible from Vercel
3. Check that `REDIS_ENABLED` is set to `true`
4. Verify that the Redis provider supports the commands you're using

### Session Persistence Issues

If sessions are not persisting:

1. Verify `SESSION_PERSISTENCE` is set to `true`
2. Check that the Session table exists in your database
3. Ensure the session store is configured correctly

## Scaling Considerations

### Database Scaling

Neon PostgreSQL automatically scales with your application. However, consider:

1. Setting up read replicas for read-heavy workloads
2. Monitoring query performance and optimizing slow queries
3. Implementing proper indexing for frequently accessed data

### Redis Scaling

For Redis scaling:

1. Use a managed Redis service that offers automatic scaling
2. Implement proper TTL for cached data to prevent memory issues
3. Consider Redis Cluster for high-availability requirements

## Monitoring and Maintenance

### Health Checks

The application includes a health check endpoint at `/_vercel/health` that returns the status of:

1. Database connectivity
2. Redis connectivity (if enabled)
3. Overall application health

### Logging

The application uses structured logging that can be integrated with logging services:

1. Set up a logging service like Datadog, Loggly, or Papertrail
2. Configure the service to capture logs from Vercel
3. Set up alerts for critical errors

## Conclusion

By following this deployment guide, you should have successfully deployed the RRDM application to Vercel with Neon PostgreSQL and Redis. The enhanced components (error handling, session management, and Redis implementation) ensure the application is robust and reliable in a production environment.

If you encounter any issues during deployment, refer to the troubleshooting section or consult the Vercel documentation.
