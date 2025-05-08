# RRDM Database Schema Documentation

## Overview

The RRDM application uses a PostgreSQL database managed through Prisma ORM. This document provides a comprehensive reference for the database schema, including tables, relationships, and field descriptions.

## Database Models

### Users

Stores user account information for authentication and access control.

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| id          | String    | Primary key, UUID                                |
| email       | String    | User's email address (unique)                    |
| name        | String    | User's full name                                 |
| password    | String    | Hashed password                                  |
| role        | String    | User role (admin, business)                      |
| active      | Boolean   | Whether the user account is active               |
| lastLogin   | DateTime? | Timestamp of the last successful login           |
| createdAt   | DateTime  | Timestamp when the user was created              |
| updatedAt   | DateTime  | Timestamp when the user was last updated         |

### Session

Stores user session data for authentication persistence.

| Field     | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| id        | String   | Primary key, session ID                          |
| data      | String   | Serialized session data                          |
| expiresAt | DateTime | Timestamp when the session expires               |

### BCR (Business Change Request)

Stores business change requests submitted by users.

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| id          | String    | Primary key, UUID                                |
| bcrNumber   | String    | Unique BCR reference number                      |
| title       | String    | Title of the BCR                                 |
| description | String    | Detailed description of the change request       |
| impact      | String    | Impact areas affected by the change              |
| status      | String    | Current status (draft, submitted, approved, etc.)|
| phase       | String?   | Current workflow phase                           |
| notes       | String?   | Additional notes and comments                    |
| requestedBy | String    | Foreign key to Users table                       |
| assignedTo  | String?   | Foreign key to Users table (optional)            |
| createdAt   | DateTime  | Timestamp when the BCR was created               |
| updatedAt   | DateTime  | Timestamp when the BCR was last updated          |

### BcrConfig

Stores configuration data for the BCR module.

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| id          | String    | Primary key, UUID                                |
| type        | String    | Configuration type (status, phase, impactArea)   |
| name        | String    | Display name                                     |
| value       | String    | Configuration value                              |
| description | String?   | Optional description                             |
| order       | Int       | Display order                                    |
| active      | Boolean   | Whether the configuration is active              |
| createdAt   | DateTime  | Timestamp when the config was created            |
| updatedAt   | DateTime  | Timestamp when the config was last updated       |

### ReferenceData

Stores reference data items.

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| id          | String    | Primary key, UUID                                |
| name        | String    | Display name of the reference data item          |
| category    | String    | Category (e.g., ethnicity, gender)               |
| status      | String?   | Status (Active, Updated, Removed)                |
| changeType  | String?   | Type of change (New, Modified, No Change)        |
| lastUpdated | DateTime? | Timestamp of the last update                     |
| createdAt   | DateTime  | Timestamp when the item was created              |
| updatedAt   | DateTime  | Timestamp when the item was last updated         |

### ReferenceValue

Stores values for reference data items.

| Field           | Type      | Description                                      |
|-----------------|-----------|--------------------------------------------------|
| id              | String    | Primary key, UUID                                |
| referenceDataId | String    | Foreign key to ReferenceData table               |
| name            | String    | Display name of the value                        |
| code            | String?   | Code or identifier for the value                 |
| status          | String?   | Status (Active, Updated, Removed)                |
| validFrom       | DateTime? | Date from which the value is valid               |
| validTo         | DateTime? | Date until which the value is valid              |
| createdAt       | DateTime  | Timestamp when the value was created             |
| updatedAt       | DateTime  | Timestamp when the value was last updated        |

### FundingData

Stores funding data items.

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| id          | String    | Primary key, UUID                                |
| name        | String    | Name of the funding item                         |
| description | String?   | Description of the funding item                  |
| type        | String    | Type of funding                                  |
| category    | String?   | Funding category                                 |
| academicYear| String?   | Academic year the funding applies to             |
| createdAt   | DateTime  | Timestamp when the item was created              |
| updatedAt   | DateTime  | Timestamp when the item was last updated         |

### FundingAllocation

Stores funding allocations.

| Field         | Type      | Description                                      |
|---------------|-----------|--------------------------------------------------|
| id            | String    | Primary key, UUID                                |
| fundingDataId | String    | Foreign key to FundingData table                 |
| amount        | Float     | Allocation amount                                |
| description   | String?   | Description of the allocation                    |
| startDate     | DateTime  | Start date of the allocation period              |
| endDate       | DateTime  | End date of the allocation period                |
| createdBy     | String    | Foreign key to Users table                       |
| createdAt     | DateTime  | Timestamp when the allocation was created        |
| updatedAt     | DateTime  | Timestamp when the allocation was last updated   |

## Relationships

### Users Relationships

- **BCRs (requestedBy)**: One-to-many relationship with BCR table
- **BCRs (assignedTo)**: One-to-many relationship with BCR table
- **FundingAllocations**: One-to-many relationship with FundingAllocation table

### BCR Relationships

- **RequestedBy User**: Many-to-one relationship with Users table
- **AssignedTo User**: Many-to-one relationship with Users table

### ReferenceData Relationships

- **ReferenceValues**: One-to-many relationship with ReferenceValue table

### FundingData Relationships

- **FundingAllocations**: One-to-many relationship with FundingAllocation table

## Indexes

- **Users.email**: Unique index for user email addresses
- **BCR.bcrNumber**: Unique index for BCR reference numbers
- **ReferenceData.category_name**: Compound index for efficient lookups
- **Session.expiresAt**: Index for session cleanup

## Database Migrations

Database migrations are managed through Prisma Migrate. The migration history is stored in the `prisma/migrations` directory, with each migration containing:

- SQL statements to apply the changes
- Migration metadata

To apply migrations:

```bash
npm run prisma:migrate
```

To view the database in Prisma Studio:

```bash
npm run prisma:studio
```

## Environment-Specific Configurations

The database connection is configured differently for each environment:

- **Development**: Local PostgreSQL or Neon PostgreSQL development instance
- **Staging**: Neon PostgreSQL staging instance
- **Production**: Neon PostgreSQL production instance

Connection strings are stored in the respective `.env` files and loaded through the environment configuration module.
