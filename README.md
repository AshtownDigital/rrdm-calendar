# Reference Data Management System

A frontend application for managing reference data using the GOV.UK Frontend Design System.

## Features

- Dashboard for managing reference data items
- Reference Data Items View (list of all items)
- Reference Data Values View (values associated with an item)
- History Tracking (view changes across academic years)
- Active Data Overview (filtered by academic year)
- Release Notes Page (summarizing all changes)
- Navigation Component with Search
- Sorting, filtering, and export options

## Project Structure

```
/reference-data-management/
│── /public/                  # Static assets (CSS, JS, images)
│   │── /styles/             # GOV.UK Frontend styles
│   │── /scripts/            # JavaScript files
│   │── /assets/             # Fonts, images, manifest
│── /views/                   # GOV.UK Nunjucks templates
│   │── /layouts/            # Base templates (layout, structure)
│   │── /partials/           # Reusable UI components
│   │── /modules/            # Feature modules
│       │── /dashboard/      # Dashboard module
│       │── /items/          # Reference Data Items module
│       │── /values/         # Reference Data Values module
│       │── /release-notes/  # Release Notes module
│       │── /bcr/            # Business Change Request module
│       │── /funding/        # Funding module
│── /prisma/                 # Prisma schema and migrations
│   │── schema.prisma       # Database schema definition
│── /services/               # Service modules for database operations
│── /routes/                 # Express route handlers
│── /docs/                   # Documentation
│── server.js               # Express server
│── package.json           # Dependencies
```

## Technology Stack

- Frontend Framework: GOV.UK Frontend (HTML, Nunjucks)
- Templating Engine: Nunjucks
- Database: Neon PostgreSQL
- ORM: Prisma
- Server: Express.js
- Styling: GOV.UK Design System
- Deployment: Vercel

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@hostname:port/database"
   SESSION_SECRET="your-session-secret"
   ```

3. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application:
   Open your browser and navigate to `http://localhost:3001`

## Development

- The application uses Nunjucks for templating
- Static data is stored in JSON files in the `/data` directory
- Each feature is organized as a module in `/views/modules`
- Routes are handled by Express.js in the `/routes` directory
- Styles follow the GOV.UK Design System guidelines

## Features & Enhancements

- ✅ GOV.UK Frontend components
- ✅ Static JSON data (no database required)
- ✅ Dropdown for selecting academic years
- ✅ Search bar added to navigation
- ✅ Fully accessible (ARIA compliance)
- ✅ Mobile responsive (GOV.UK layout grid)
- ✅ Status & Change Type in all index tables

## Contributing

1. Follow the GOV.UK Design System guidelines
2. Maintain modular structure
3. Keep templates simple and accessible
4. Test thoroughly before submitting changes

## License

This project is licensed under the MIT License.

## Deployment & CI/CD Pipeline

### Repository Structure

The project uses a three-branch strategy for development and deployment:

- `main` - Active development branch
- `staging` - Staging environment for testing
- `production` - Production deployment branch

### CI/CD Pipeline

The project is configured with GitHub Actions for continuous integration and Heroku Pipelines for deployment:

1. **GitHub Actions Workflow**
   - Runs on pushes to `main`, `staging`, and `production` branches
   - Performs automated testing and build validation
   - See `.github/workflows/node.js.yml` for details

2. **Heroku Pipeline**
   - `rrdm-stage` app (staging environment)
   - `rrdm-production` app (production environment)

### Deployment Process

1. **Development**:
   - Make changes on the `main` branch
   - Use pull requests to merge changes to `staging`

2. **Staging**:
   - Changes pushed to `staging` branch are automatically deployed to the staging app
   - Test thoroughly in the staging environment

3. **Production**:
   - When ready for production, either:
     - Create a PR from `staging` to `production`, or
     - Use the Heroku Dashboard to promote from staging to production

```bash
# To promote from staging to production via CLI:
heroku pipelines:promote -r staging
```

### Environment Variables

Ensure these environment variables are set in your Heroku apps:

- `NODE_ENV`: Set to `test-deployment` for staging and `production` for production
- `USE_SIMPLE_SERVER`: Set to `true` for simplified server mode during testing, `false` for full server mode
- `MONGODB_URI`: MongoDB connection string
- `SESSION_SECRET`: Secret for session cookie signing
