# RRDM Environment Configuration

## Overview

The RRDM application supports three environments:

- **Development**: For local development and testing
- **Staging**: For pre-production testing
- **Production**: For live production use

Each environment has its own configuration files and deployment process.

## Environment Files

The application uses environment-specific `.env` files to configure each environment:

- `.env.development` - Development environment configuration
- `.env.staging` - Staging environment configuration
- `.env.production` - Production environment configuration
- `.env` - Default configuration (used as fallback)

## Environment Variables

The following environment variables are used across all environments:

| Variable | Description | Example |
|----------|-------------|--------|
| `NODE_ENV` | Current environment | `development`, `staging`, `production` |
| `PORT` | Server port | `24680` |
| `SESSION_SECRET` | Secret for session encryption | `your-secret-key` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:port/database?sslmode=require` |
| `LOG_LEVEL` | Logging level | `debug`, `info`, `warn`, `error` |
| `ENABLE_MOCK_DATA` | Enable mock data | `true`, `false` |
| `ENABLE_DEBUG_ROUTES` | Enable debug routes | `true`, `false` |

## Database Configuration

The application uses Neon PostgreSQL for all environments. Each environment has its own database:

### Development

```
DATABASE_URL=postgresql://neondb_owner:npg_mZbQp7qF9zSN@ep-floral-meadow-a5n7bkpa-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Staging

```
DATABASE_URL=postgresql://neondb_owner:npg_mZbQp7qF9zSN@ep-floral-meadow-a5n7bkpa-pooler.us-east-2.aws.neon.tech/neondb_staging?sslmode=require
```

### Production

```
DATABASE_URL=postgresql://neondb_owner:npg_mZbQp7qF9zSN@ep-floral-meadow-a5n7bkpa-pooler.us-east-2.aws.neon.tech/neondb_production?sslmode=require
```

## Running the Application

### Local Development

To run the application in development mode:

```bash
npm run dev
```

Or using Vercel's local development environment:

```bash
npm run vercel-dev
```

### Staging

To run the application in staging mode:

```bash
npm run staging
```

### Production

To run the application in production mode:

```bash
npm run prod
```

## Deployment

The application is deployed to Vercel using environment-specific configuration files:

- `vercel.development.json` - Development environment configuration
- `vercel.staging.json` - Staging environment configuration
- `vercel.production.json` - Production environment configuration

### Deployment Scripts

Use the following scripts to deploy to each environment:

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

## Prisma Database Management

The application uses Prisma for database management. Use the following scripts to manage the database:

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Environment Configuration Module

The application uses a centralized environment configuration module (`config/env.js`) to load the appropriate environment variables and provide a unified interface for accessing configuration values.

```javascript
const config = require('./config/env');

// Access configuration values
const port = config.port;
const isDev = config.isDev;
const databaseUrl = config.databaseUrl;
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues, check the following:

1. Ensure the database connection string is correct in the environment file
2. Verify that the database server is running and accessible
3. Check if the database user has the necessary permissions
4. Ensure SSL mode is properly configured

### Vercel Deployment Issues

If you encounter issues deploying to Vercel, check the following:

1. Ensure the Vercel CLI is installed and configured
2. Verify that the Vercel configuration file exists and is correctly formatted
3. Check if the environment variables are correctly set in the Vercel configuration file
4. Ensure you have the necessary permissions to deploy to the Vercel project