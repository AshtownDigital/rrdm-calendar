# Vercel Authentication Fix Guide

This guide explains how to fix authentication issues on your Vercel deployment of the RRDM application.

## Prerequisites

- Vercel CLI installed (`npm i -g vercel`)
- Access to your Vercel project dashboard
- Access to your Neon PostgreSQL database

## Step 1: Ensure the Fix Script is Included in Your Deployment

The `fix-deployed-auth.js` script must be included in your Vercel deployment:

1. The script is already in your project at `/scripts/fix-deployed-auth.js`
2. Make sure this directory is not excluded in your `.vercelignore` file
3. Commit and push the script to your repository if using Git-based deployments

## Step 2: Set Up Environment Variables in Vercel

Ensure your Vercel project has the correct environment variables:

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your RRDM project
3. Go to "Settings" → "Environment Variables"
4. Verify that `DATABASE_URL` is set correctly to your Neon PostgreSQL connection string
5. The connection string should look like: `postgresql://user:password@hostname:port/database?sslmode=require`
6. Add any other required environment variables:
   - `SESSION_SECRET` (for session encryption)
   - `NODE_ENV` (set to "production")

## Step 3: Run the Fix Script on Vercel

### Option A: Using Vercel CLI

```bash
# Login to Vercel if not already logged in
vercel login

# Link to your project if not already linked
vercel link

# Run the script in the production environment
vercel --prod run scripts/fix-deployed-auth.js
```

### Option B: Using a One-Time Deployment Hook

1. Create a temporary API route in your project:

```javascript
// pages/api/run-auth-fix.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default async function handler(req, res) {
  // Add a secret token for security
  if (req.query.token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { stdout, stderr } = await execPromise('node scripts/fix-deployed-auth.js');
    return res.status(200).json({ 
      success: true, 
      stdout, 
      stderr 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

2. Deploy your application with this new API route
3. Set an `ADMIN_SECRET` environment variable in your Vercel project
4. Access the route with your secret token: `https://your-app.vercel.app/api/run-auth-fix?token=your-admin-secret`
5. Remove this API route after fixing the authentication issues

## Step 4: Verify the Fix

After running the script:

1. Try logging in with the default admin credentials:
   - Email: `prod@email.com`
   - Password: `password1254`

2. If you had existing credentials that worked locally, try those as well

3. Check the Vercel logs for any errors:
   - Go to your Vercel dashboard
   - Select your project
   - Go to "Deployments" → select the latest deployment
   - Click on "Functions" and look for any errors

## Troubleshooting

If you still encounter login issues:

1. **Check Database Connection**:
   - Verify your Neon PostgreSQL database is accessible from Vercel
   - Ensure your `DATABASE_URL` is correctly formatted with SSL enabled

2. **Verify Table Structure**:
   - Connect to your database directly and check the structure of the `Users` and `Session` tables
   - The `Users` table should have columns for `id`, `email`, `password`, etc.
   - The `Session` table should have columns for `id`, `sid`, `data`, and `expiresAt`

3. **Check for Error Logs**:
   - Review the Vercel Function logs for any errors
   - Look for authentication-related errors in your application logs

4. **Session Issues**:
   - If sessions aren't persisting, ensure your `SESSION_SECRET` is properly set
   - Verify that your application is configured to use the Prisma session store

## Additional Support

If you continue to experience issues:

1. Run the script locally with your production database URL to debug
2. Check for any differences between your local and production environments
3. Consider temporarily enabling more verbose logging in your production environment
