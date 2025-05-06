# Vercel Deployment Guide for RRDM

This guide provides step-by-step instructions for deploying the Reference Data Management (RRDM) application to Vercel.

## Prerequisites

Before deploying to Vercel, ensure you have:

1. A [Vercel account](https://vercel.com/signup)
2. A [Neon PostgreSQL database](https://neon.tech/) (or another PostgreSQL provider)
3. Git repository with your RRDM codebase
4. Node.js and npm installed locally

## Preparation Steps

1. **Prepare your application for deployment**

   Run the Vercel preparation script to ensure your application is ready for deployment:

   ```bash
   npm run vercel:prepare
   ```

   This script will:
   - Generate a production environment file
   - Generate the Prisma client
   - Create database indexes for optimal performance

2. **Verify your application locally**

   Make sure your application runs correctly in development mode:

   ```bash
   npm run dev
   ```

   Test all critical functionality to ensure everything works as expected.

## Deployment Steps

### Option 1: Deploy using the Vercel CLI

1. **Install the Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**

   ```bash
   vercel login
   ```

3. **Deploy the application**

   From your project directory, run:

   ```bash
   vercel
   ```

   Follow the prompts to configure your deployment.

### Option 2: Deploy using the Vercel Dashboard

1. **Push your code to a Git repository**

   Ensure your code is pushed to GitHub, GitLab, or Bitbucket.

2. **Import your repository in Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" > "Project"
   - Select your repository
   - Configure the project settings:
     - Framework Preset: Node.js
     - Build Command: `npm run vercel-build`
     - Output Directory: `public`
     - Install Command: `npm install`

3. **Configure environment variables**

   Add the following environment variables in the Vercel dashboard:

   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `SESSION_SECRET`: A secure random string for session encryption
   - `PRISMA_CLIENT_ENGINE_TYPE`: Set to `dataproxy`
   - `NODE_ENV`: Set to `production`

4. **Deploy the application**

   Click "Deploy" and wait for the deployment to complete.

## Post-Deployment Steps

1. **Run database migrations**

   After deployment, you may need to run database migrations:

   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

2. **Seed the database (if needed)**

   If you need to seed the database with initial data:

   ```bash
   npx prisma db seed
   ```

3. **Verify the deployment**

   - Visit your deployed application URL
   - Test all critical functionality
   - Check for any errors in the Vercel logs

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   - Verify your `DATABASE_URL` environment variable is correct
   - Ensure your database is accessible from Vercel's servers
   - Check if your database has connection limits

2. **Build Failures**

   - Check the build logs in the Vercel dashboard
   - Ensure all dependencies are correctly listed in `package.json`
   - Verify that your `vercel-build` script is correct

3. **Runtime Errors**

   - Check the function logs in the Vercel dashboard
   - Ensure all environment variables are set correctly
   - Verify that your Prisma schema matches your database schema

## Maintenance

### Updating Your Deployment

1. **Push changes to your Git repository**

   Vercel will automatically deploy new changes when you push to your repository.

2. **Manual redeployment**

   You can also manually redeploy from the Vercel dashboard or using the CLI:

   ```bash
   vercel --prod
   ```

### Monitoring

1. **Vercel Analytics**

   Enable Vercel Analytics to monitor your application's performance.

2. **Logs**

   Check the function logs in the Vercel dashboard for any errors or issues.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Neon PostgreSQL Documentation](https://neon.tech/docs/introduction)

## Support

If you encounter any issues with your deployment, please refer to the Vercel documentation or contact the Vercel support team.
