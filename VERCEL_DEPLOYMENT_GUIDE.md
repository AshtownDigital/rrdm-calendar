# RRDM Vercel Deployment Guide

This guide will help you successfully deploy your RRDM application to Vercel, ensuring that all features work correctly in a serverless environment.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- A cloud PostgreSQL database (recommended: [Neon](https://neon.tech))
- Vercel CLI installed (`npm install -g vercel`)

## Step 1: Set Up Your Database

For serverless environments like Vercel, you need a cloud-hosted database. The application won't be able to connect to a local PostgreSQL instance.

1. Create a Neon PostgreSQL database at [neon.tech](https://neon.tech)
2. Get your connection string in the format: `postgresql://user:password@db.neon.tech/dbname?pgbouncer=true&pool_timeout=10`

## Step 2: Configure Your Environment

Run the setup script to configure your environment variables:

```bash
node scripts/setup-vercel-env.js
```

This will:
- Create a `.env.production` file with your database connection string
- Ensure your `vercel.json` is properly configured

## Step 3: Verify Database Connection

Before deploying, verify that your application can connect to the database in serverless mode:

```bash
node scripts/verify-database-connection.js
```

Make sure it shows successful connections in both standard and serverless modes.

## Step 4: Deploy to Vercel

1. Login to Vercel:
   ```bash
   vercel login
   ```

2. Deploy your application:
   ```bash
   vercel deploy --prod
   ```

3. Set environment variables on Vercel:
   ```bash
   vercel env add DATABASE_URL
   # Enter your Neon PostgreSQL connection string when prompted
   
   vercel env add PRISMA_CLIENT_ENGINE_TYPE
   # Enter "dataproxy" when prompted
   ```

4. Redeploy with the new environment variables:
   ```bash
   vercel deploy --prod
   ```

## Step 5: Verify Deployment

1. Check the Vercel deployment logs for any errors
2. Visit your deployed application URL
3. Test key functionality:
   - BCR submissions
   - Static assets (CSS, images)
   - Database operations

## Troubleshooting

### CSS Not Loading

If CSS is not loading, check:
- The network tab in your browser's developer tools
- Vercel logs for 404 errors on CSS files
- The `vercel.json` routes configuration

### Database Connection Issues

If you're having database connection problems:
- Verify your `DATABASE_URL` is correctly set in Vercel
- Ensure `PRISMA_CLIENT_ENGINE_TYPE=dataproxy` is set
- Check that your database is accessible from Vercel's servers
- Run `vercel env pull` to verify environment variables

### BCR Submissions Not Working

If BCR submissions are failing:
- Check for CSRF token errors in the console
- Verify that your database schema is correctly set up
- Look for errors in the Vercel logs

## Key Changes Made

1. **Centralized Prisma Client**: All database connections now use a single Prisma client instance from `config/prisma.js`
2. **Serverless Detection**: The application now detects when it's running in a serverless environment
3. **Static Asset Handling**: Improved routing for CSS and other static assets
4. **Server Startup**: Modified to handle both standard and serverless environments

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Data Proxy Documentation](https://www.prisma.io/docs/concepts/components/prisma-data-platform/prisma-data-proxy)
- [Neon PostgreSQL Documentation](https://neon.tech/docs)
