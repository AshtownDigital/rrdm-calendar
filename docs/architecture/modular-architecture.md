# BCR Application Modular Architecture

## Overview

This document outlines the modular architecture of the Business Change Request (BCR) application. The application follows a modular design pattern to improve maintainability, testability, and separation of concerns.

## Architecture Components

### 1. Modular Controllers

Controllers are organized by functional domain and follow a consistent pattern:

- **Dashboard Controller** (`dashboardController.js`): Handles dashboard and statistics views
- **BCR Controller** (`bcrController.js`): Manages BCR listing and viewing
- **Submission Controller** (`submissionController.js`): Handles submission forms, creation, and updates
- **Workflow Controller** (`workflowController.js`): Manages workflow transitions and status updates

Each controller:
- Focuses on a specific functional area
- Uses shared services for common functionality
- Includes proper error handling and logging
- Passes consistent data to views

### 2. Shared Services

Services provide reusable functionality across controllers:

- **Logger Service** (`loggerService.js`): Structured logging with Winston
- **Status Tag Service** (`statusTagService.js`): Consistent status tag generation
- **Validation Service** (`validationService.js`): Form validation logic
- **Pagination Service** (`paginationService.js`): Pagination calculations and query handling

### 3. View Models

View models transform data from the database into formats suitable for views:

- **Dashboard View Model** (`dashboardViewModel.js`): Prepares data for dashboard views
- **BCR View Model** (`bcrViewModel.js`): Formats BCR data for display

### 4. Reusable UI Components

UI components are implemented as EJS partials:

- **Status Tags** (`statusTag.ejs`): Consistent status indicators
- **Form Elements** (`formElements/textInput.ejs`, `formElements/selectInput.ejs`): Reusable form controls
- **Pagination** (`pagination.ejs`): Standardized pagination controls

### 5. Routes

Routes are organized by module and use middleware for common functionality:

- **Modular Routes** (`routes/modules/bcr/modular.js`): Routes using modular controllers
- **Legacy Routes** (`routes/modules/bcr/index.js`): Routes using the monolithic controller (to be migrated)

## Migration Plan

The application is being gradually migrated from a monolithic controller to the modular architecture:

### Phase 1: Infrastructure (Completed)
- Create modular controller structure
- Implement shared services
- Create reusable UI components

### Phase 2: Controller Migration (In Progress)
- Migrate dashboard functionality
- Migrate BCR viewing functionality
- Migrate submission functionality
- Migrate workflow functionality

### Phase 3: Route Migration
- Update routes to use modular controllers
- Add appropriate middleware
- Maintain backward compatibility

### Phase 4: View Migration
- Update views to use reusable components
- Standardize view structure and naming

### Phase 5: Testing
- Write unit tests for controllers
- Write unit tests for services
- Write integration tests

## Logging Strategy

The application uses structured logging with the following principles:

- **Module-specific loggers**: Each module gets its own logger instance
- **Contextual metadata**: Logs include user IDs and relevant entity IDs
- **Log levels**: Different levels (info, error, warn, debug) for different purposes
- **Multiple transports**: Console for development, files for production

Example:
```javascript
// Create a module-specific logger
const logger = createModuleLogger('bcrController');

// Log with context
logger.info('Loading BCR details', { userId: req.user?.id, bcrId: req.params.id });
```

## Testing Strategy

Tests are organized by component type:

- **Controller Tests**: Test request handling, view rendering, and error handling
- **Service Tests**: Test business logic and data transformation
- **Model Tests**: Test database operations and validation

Example controller test:
```javascript
describe('Dashboard Controller', () => {
  it('should render the dashboard view with data from view model', async () => {
    // Arrange
    const mockDashboardData = { ... };
    viewModelStub.resolves(mockDashboardData);
    
    // Act
    await dashboardController.dashboard(req, res);
    
    // Assert
    expect(res.render).to.have.been.calledWith('modules/bcr/dashboard', { ... });
  });
});
```

## Best Practices

1. **Error Handling**: All controllers should handle errors and provide appropriate user feedback
2. **Logging**: Use structured logging with appropriate context
3. **Validation**: Validate all user input using the validation service
4. **Separation of Concerns**: Keep controllers focused on request handling, use services for business logic
5. **Consistent Response Format**: Maintain consistent view data structure
6. **Database Connection Handling**: Check connection state and handle timeouts
7. **User Context**: Always pass user information to views for authorization checks

## Future Improvements

1. **API Layer**: Create a RESTful API for frontend interactions
2. **Authentication Middleware**: Enhance authentication and authorization
3. **Caching**: Implement caching for frequently accessed data
4. **Performance Monitoring**: Add performance metrics logging
5. **Internationalization**: Support multiple languages
