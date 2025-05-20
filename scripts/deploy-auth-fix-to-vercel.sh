#!/bin/bash
# Script to deploy the authentication fix to Vercel

echo "===== RRDM Authentication Fix Deployment ====="
echo "This script will help deploy the authentication fix to Vercel"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel if needed
echo "Checking Vercel login status..."
VERCEL_TOKEN=$(vercel whoami 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Please login to Vercel:"
    vercel login
fi

# Link to project if needed
echo "Checking project link status..."
if [ ! -f ".vercel/project.json" ]; then
    echo "Linking to Vercel project..."
    vercel link
fi

# Ensure the fix script is included in the deployment
echo "Ensuring fix script is included in deployment..."
if [ ! -f "scripts/fix-deployed-auth.js" ]; then
    echo "Error: scripts/fix-deployed-auth.js not found!"
    exit 1
fi

# Check if .vercelignore exists and make sure scripts directory is not ignored
if [ -f ".vercelignore" ]; then
    if grep -q "scripts" ".vercelignore"; then
        echo "Warning: 'scripts' directory is ignored in .vercelignore"
        echo "Please remove or comment out this line to include the fix script"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Verify environment variables
echo "Checking environment variables..."
VERCEL_ENV=$(vercel env ls 2>/dev/null | grep DATABASE_URL)
if [ -z "$VERCEL_ENV" ]; then
    echo "Warning: DATABASE_URL environment variable not found in Vercel"
    echo "Please set this in your Vercel project settings"
    echo "Format: postgresql://user:password@hostname:port/database?sslmode=require"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy the application
echo "Deploying the application to Vercel..."
vercel --prod

# Run the fix script
echo "Running the authentication fix script..."
vercel --prod run scripts/fix-deployed-auth.js

echo "===== Deployment Complete ====="
echo "You should now be able to log in with:"
echo "Email: prod@email.com"
echo "Password: password1254"
echo "Or use your existing credentials if they were working locally"
