# MongoDB Migration Guide for RRDM

This guide provides step-by-step instructions for migrating the RRDM application from PostgreSQL (Prisma) to MongoDB.

## Prerequisites

- MongoDB Atlas account (or local MongoDB installation)
- MongoDB connection string
- Node.js and npm installed

## Migration Overview

The migration process involves:

1. Setting up MongoDB models
2. Configuring database connections
3. Migrating data from PostgreSQL to MongoDB
4. Updating application code to use MongoDB

## Step 1: Configure MongoDB Connection

1. Set your MongoDB password in the `.env` file:

```bash
node scripts/set-mongo-password.js
```

2. Test the MongoDB connection:

```bash
node scripts/test-mongo-connection.js
```

## Step 2: Run the Migration

The migration script will transfer all data from PostgreSQL to MongoDB:

```bash
# Run the migration tool with interactive prompts
node scripts/run-mongodb-migration.js

# Or run the migration directly
node scripts/migrate-to-mongodb.js
```

You can also migrate specific entities:

```bash
# Migrate only users
node scripts/migrate-to-mongodb.js --entity=users

# Migrate only BCR configurations
node scripts/migrate-to-mongodb.js --entity=bcrconfigs

# Migrate with overwrite option
node scripts/migrate-to-mongodb.js --overwrite
```

## Step 3: Verify Migration

After migration, verify that all data has been correctly transferred:

1. Check that users, BCR submissions, and configurations are present in MongoDB
2. Verify relationships between entities (e.g., BCRs linked to correct submissions)
3. Test the application using MongoDB

## Step 4: Update Application Code

The migration includes MongoDB models for all entities:

- `User` - User accounts and authentication
- `Bcr` - Business Change Requests
- `BcrConfig` - Configuration for BCR module (urgency levels, impact areas)
- `Submission` - BCR submissions
- `BcrWorkflowActivity` - Workflow activities for BCRs
- `WorkflowPhase` - Workflow phases for the BCR process
- `ImpactedArea` - Impact areas for BCRs
- `Funding` - Funding data for the Funding module
- `ReferenceData` - Reference data for the application
- `AuditLog` - Audit logs for tracking changes

Update your controllers and services to use these MongoDB models instead of Prisma.

## Step 5: Run the Application with MongoDB

Start the application using MongoDB as the database:

```bash
npm run dev
```

## Troubleshooting

### Connection Issues

If you encounter MongoDB connection issues:

1. Verify your MongoDB connection string in `.env`
2. Check that your IP address is whitelisted in MongoDB Atlas
3. Ensure the MongoDB user has the correct permissions

### Data Migration Issues

If data migration fails:

1. Check the error messages in the console
2. Verify that PostgreSQL is running and accessible
3. Try migrating specific entities one at a time

### Application Issues

If the application doesn't work with MongoDB:

1. Check that all controllers and services are updated to use MongoDB models
2. Verify that MongoDB models have the correct schema
3. Look for any remaining Prisma references in the code

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

## Support

If you encounter any issues during migration, please contact the RRDM support team.
