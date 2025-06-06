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
│── /data/                   # Static JSON files
│── /routes/                 # Express route handlers
│── server.js               # Express server
│── package.json           # Dependencies
```

## Technology Stack

- Frontend Framework: GOV.UK Frontend (HTML, Nunjucks)
- Templating Engine: Nunjucks
- Static Data: JSON files
- Server: Express.js
- Styling: GOV.UK Design System

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
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
