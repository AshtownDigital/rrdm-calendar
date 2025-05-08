# RRDM Application Architecture

## Overview

The Register Team Reference Data Management (RRDM) system is a web application built with Express.js, Nunjucks templating, and Prisma ORM with a PostgreSQL database. The application follows a modular architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Presentation   │     │    Business     │     │     Data        │
│     Layer       │◄────┤     Layer       │◄────┤    Layer        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       ▲                        ▲                       ▲
       │                        │                       │
       ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Views (Nunjucks)│     │  Controllers    │     │  Prisma Models  │
│  & Public Assets │     │  & Services     │     │  & Database     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Directory Structure

```
rrdm/
├── api/                  # API routes with versioning
│   ├── v1/               # API v1 routes
│   └── index.js          # Main API router
├── config/               # Configuration files
│   ├── database.js       # Database configuration
│   ├── env.js            # Environment configuration
│   └── passport-db.js    # Passport authentication configuration
├── controllers/          # Route controllers organized by module
│   ├── access/           # Authentication and user management
│   ├── api/              # API controllers
│   ├── bcr/              # BCR module controllers
│   ├── funding/          # Funding module controllers
│   └── reference-data/   # Reference data module controllers
├── data/                 # JSON data files
├── docs/                 # Documentation
├── middleware/           # Express middleware
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Centralized error handling
│   └── token-refresh.js  # Token refresh middleware
├── prisma/               # Prisma ORM configuration
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── public/               # Static assets
│   ├── javascripts/      # Client-side JavaScript
│   ├── stylesheets/      # CSS files
│   └── images/           # Image assets
├── routes/               # Express routes organized by module
├── scripts/              # Utility scripts
├── services/             # Business logic services
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── utils/                # Utility functions
├── views/                # Nunjucks templates
│   ├── layouts/          # Layout templates
│   ├── partials/         # Partial templates
│   └── modules/          # Module-specific templates
├── .env                  # Environment variables
├── .env.development      # Development environment variables
├── .env.staging          # Staging environment variables
├── .env.production       # Production environment variables
├── package.json          # Project dependencies and scripts
├── server.js             # Application entry point
└── vercel.json           # Vercel deployment configuration
```

## Key Components

### 1. Presentation Layer

- **Views**: Nunjucks templates organized by module
- **Public Assets**: Static files (CSS, JavaScript, images)
- **Layouts**: Base templates that define the overall structure

### 2. Business Layer

- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic and interact with the data layer
- **Middleware**: Process requests before they reach controllers

### 3. Data Layer

- **Prisma Models**: Define the database schema
- **Database**: PostgreSQL database hosted on Neon
- **Data Access**: Prisma ORM for database operations

## Module Structure

Each functional module follows a consistent structure:

- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define URL endpoints
- **Views**: Nunjucks templates for rendering HTML
- **Services**: Implement module-specific business logic

## Authentication Flow

1. User submits login credentials
2. Passport.js authenticates the user against the database
3. On successful authentication, a session is created
4. Session data is stored in the database using PrismaSessionStore
5. User is redirected to the dashboard

## API Architecture

- **Versioned API**: `/api/v1/...` for current version
- **Legacy Support**: Original endpoints maintained for backward compatibility
- **Standardized Responses**: Consistent JSON format for all API responses
- **Error Handling**: Centralized error handling for API routes

## Error Handling

- **Centralized Middleware**: All errors are processed through the errorHandler middleware
- **API Errors**: Return JSON responses with appropriate status codes
- **Web Errors**: Render error templates with user-friendly messages
- **Session Errors**: Special handling for session-related errors

## Testing Strategy

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions between components
- **API Tests**: Verify API endpoints and responses
- **Mock Objects**: Use Jest mocks for external dependencies

## Deployment

- **Vercel**: Serverless deployment platform
- **Environment Configuration**: Different configurations for development, staging, and production
- **Automated Deployment**: Scripts for deploying to different environments
