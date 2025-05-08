# MVC Architecture in RRDM

This document outlines the Model-View-Controller (MVC) architecture implemented in the RRDM application.

## Overview

The RRDM application has been refactored to follow the MVC pattern, which separates the application into three main components:

1. **Models**: Data structures and database interactions
2. **Views**: User interface templates
3. **Controllers**: Business logic that connects models and views

## Directory Structure

```
rrdm/
├── controllers/           # Controllers for all modules
│   ├── access/            # Authentication and user management
│   ├── api/               # API endpoints
│   ├── bcr/               # BCR management
│   ├── funding/           # Funding management
│   ├── reference-data/    # Reference data management
│   └── index.js           # Main controller exports
├── models/                # Prisma models and database interactions
├── views/                 # Nunjucks templates
└── routes/                # Express routes that use controllers
```

## Controllers

Controllers handle the business logic of the application. Each controller is responsible for a specific feature or module.

### Controller Organization

Controllers are organized by module:

- **access**: Authentication and user management
  - `authController.js`: Handles login, logout, and session management
  - `userController.js`: Handles user creation, editing, and deletion

- **api**: API endpoints
  - `itemsController.js`: Handles API endpoints for reference data items

- **bcr**: BCR management
  - `indexController.js`: Main BCR management page
  - `submissionsController.js`: BCR submissions listing and filtering
  - `formController.js`: BCR submission forms and processing
  - `statusController.js`: BCR status updates and phase transitions
  - `workflowController.js`: BCR workflow management

- **funding**: Funding management
  - `indexController.js`: Main funding management page
  - `allocationsController.js`: Funding allocations management

- **reference-data**: Reference data management
  - `dashboardController.js`: Reference data dashboard
  - `itemsController.js`: Reference data items management

### Controller Methods

Each controller exports methods that correspond to specific route handlers. For example:

```javascript
// controllers/bcr/indexController.js
const indexController = {
  // GET /bcr
  index: (req, res) => {
    res.render('modules/bcr/index', {
      title: 'BCR Management',
      user: req.user
    });
  }
};

module.exports = indexController;
```

## Routes

Routes define the URL endpoints and HTTP methods that the application responds to. Each route is connected to a controller method.

Example:

```javascript
// routes/bcr/index.js
const express = require('express');
const router = express.Router();
const { indexController, submissionsController } = require('../../controllers/bcr');

// Main BCR management page
router.get('/', indexController.index);

// BCR submissions list
router.get('/submissions', submissionsController.listSubmissions);

module.exports = router;
```

## Models

Models are implemented using Prisma, which provides type-safe database access. The Prisma schema defines the data structure and relationships.

## Views

Views are implemented using Nunjucks templates. They are organized by module in the `views/modules` directory.

## Testing

Unit tests for controllers are located in the `tests/controllers` directory, organized by module. Each controller has its own test file.

Example test:

```javascript
// tests/controllers/bcr/submissionsController.test.js
const { submissionsController } = require('../../../controllers/bcr');
const { prisma } = require('../../../config/database');

// Mock the Prisma client
jest.mock('../../../config/database', () => ({
  prisma: {
    bcr: {
      findMany: jest.fn()
    }
  }
}));

describe('BCR Submissions Controller', () => {
  it('should render the submissions list view with data', async () => {
    // Test implementation
  });
});
```

## Benefits of MVC

The MVC pattern provides several benefits:

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Maintainability**: Easier to update and maintain code
3. **Testability**: Controllers can be unit tested in isolation
4. **Scalability**: New features can be added without affecting existing code
5. **Reusability**: Components can be reused across the application

## Best Practices

When working with the MVC architecture in RRDM, follow these best practices:

1. **Keep Controllers Focused**: Each controller should handle a specific feature or module
2. **Thin Controllers**: Move complex business logic to service classes
3. **Use Descriptive Method Names**: Controller methods should clearly describe their purpose
4. **Consistent Error Handling**: Use consistent error handling across all controllers
5. **Test Controllers**: Write unit tests for all controller methods
