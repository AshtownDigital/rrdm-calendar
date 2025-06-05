# RRDM Deployment Guide

## Current Status

The RRDM application has been successfully deployed to Heroku in simplified server mode:
- URL: https://rrdm-stage.herokuapp.com/
- The simplified server is running without MongoDB dependency
- Case sensitivity issues in imports have been fixed

## Deployment Configuration

### Current Environment Variables
- `USE_SIMPLE_SERVER=true` - Currently using simplified server mode
- `NODE_ENV=test-deployment` - Using test deployment environment
- `MONGODB_URI=mongodb+srv://...` - MongoDB connection URI (currently failing)

## Authentication Issue

We're encountering MongoDB authentication errors. Here are troubleshooting steps to resolve this:

### Option 1: Create a New Database User in MongoDB Atlas
1. Log into the [MongoDB Atlas dashboard](https://cloud.mongodb.com)
2. Go to "Database Access" section
3. Create a new database user with the following settings:
   - Authentication Method: Password
   - Password: Use a simple alphanumeric password (avoid special characters)
   - Database User Privileges: Select "Atlas admin" or "Read and write to any database"
   - Add User

### Option 2: Check Network Access in MongoDB Atlas
1. Go to "Network Access" section in MongoDB Atlas
2. Add a new entry: `0.0.0.0/0` (allows connections from all IPs, including Heroku)
3. Add description: "Heroku deployment"
4. Save

### Option 3: Check if the Database Exists
1. Go to "Collections" in MongoDB Atlas
2. Create a database called `rrdm` if it doesn't exist
3. Create a test collection (e.g., `test`)

## Switching to Full Application Mode

Once MongoDB is correctly configured:

```
# Update MongoDB URI with working credentials
heroku config:set MONGODB_URI="your_working_connection_string" --app rrdm-stage

# Switch to full application mode
heroku config:set USE_SIMPLE_SERVER=false NODE_ENV=production --app rrdm-stage

# Restart application
heroku restart --app rrdm-stage
```

## Monitoring

Monitor application logs to troubleshoot:
```
heroku logs --tail --app rrdm-stage
```

## Fixed Case Sensitivity Issues

The following case sensitivity issues have been fixed:
- Fixed AcademicYear model imports from `../models/AcademicYear` to `../models/academicYear`
- Fixed BCR model imports from `../models/BCR` to `../models/Bcr`
