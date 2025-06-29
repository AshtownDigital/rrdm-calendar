# RRDM Development Tools

This directory contains utilities designed to streamline the development workflow for the RRDM application.

## Available Tools

### `start-server.js`
A unified server starter that replaces multiple redundant scripts. It provides a clean interface for starting the development server with various configurations.

#### Usage:
```
node scripts/dev-tools/start-server.js [options]
```

#### Options:
- `--real-db`: Use real MongoDB instead of mock data
- `--port=<port>`: Specify port to use (default: 3000)
- `--mock-data`: Force using mock data (default in dev mode)

### NPM Scripts

The following npm scripts have been added to package.json for convenience:

- `npm run dev`: Start the development server with default settings
- `npm run dev:mongo`: Start with real MongoDB connection
- `npm run dev:mock`: Start with mock data
- `npm run dev:port`: Start on port 3001
- `npm run dev:watch`: Watch for changes and restart automatically with real MongoDB

## Consolidated Utility Scripts

### `check-bcr-utility.js`
A consolidated BCR check utility that replaces multiple redundant BCR check scripts.

#### Usage:
```
node scripts/utilities/check-bcr-utility.js [options]
```

#### Options:
- `--id=<bcr_id>`: Check BCR by ID
- `--number=<bcr_number>`: Check BCR by number
- `--list`: List all BCRs (paginated)
- `--schema`: Check BCR schema
- `--duplicates`: Check for workflow duplicates
