
# BCR System – Automated and Integrated Test Requirements

This document outlines the full testing strategy for the BCR system, covering unit tests, integration tests, route validation, and view rendering. All tests must be automated using a consistent framework, such as Jest with Supertest (for routes) and Nunjucks for views.

---

## 1. Testing Frameworks

- **Jest**: For unit and integration testing
- **Supertest**: For HTTP assertions on Express routes
- **Nunjucks + DOM Testing**: For template rendering and logic
- **date-fns-mock**: For time-sensitive logic

---

## 2. Directory Layout

Tests should reside within each module's directory or under a shared `/tests/` folder.

```
/controllers/bcr/viewController.test.js
/models/bcr-submission/model.test.js
/routes/bcr-submission/routes.test.js
/views/bcr-submission/new.test.js
/tests/setup.js
```

---

## 3. Unit Tests

### a. Models

- Validate schema constraints and enum fields
- Ensure code generation formats match (`SUB-YY/YY-NNN`)
- Validate soft delete behavior for submissions

### b. Controllers

- Mock database methods
- Test form validation logic
- Test workflow phase progression
- Assert correct logging to `workflowHistory`

### c. Helpers

- Test `generateCode()` for different record numbers
- Validate `autoAdvancePhase()` logic across all 14 workflow phases
- Format and edge cases for `formatDate()`

---

## 4. Route Integration Tests

- Use **Supertest** to simulate all endpoint behavior
- Validate:
  - Form rendering (GET)
  - Submission handling (POST)
  - Deletion routes and their guard logic
  - Phase updates
  - CSRF token enforcement

---

## 5. View Rendering Tests

- Validate view templates render without error
- Confirm presence of expected fields and CSRF tokens
- Validate logic-based rendering (e.g. dropdowns based on enums)
- Optionally integrate accessibility checks via `axe-core`

---

## 6. Required Coverage (Per Module)

| Module            | Requirement                                  |
|-------------------|----------------------------------------------|
| BCR Submission     | Create, review, soft/hard delete workflows   |
| BCR Management     | View, update, log phases                     |
| Impacted Areas     | List, create, edit, delete                   |
| Helpers            | All utility functions                       |
| Middleware         | CSRF and phase validation logic              |

---

## 7. Test Setup

**File:** `/tests/setup.js`

- Reset database before each test
- Mock global config/enums
- Seed basic impacted areas

---

## 8. Continuous Integration

- Run all tests on pull request and deployment branches
- Use coverage threshold enforcement: `--coverage --passWithNoTests`
- Example:
  ```json
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:ci": "jest --coverage"
  }
  ```

---

This test strategy ensures the BCR system is fully verifiable, maintainable, and compliant with CI pipelines for production-grade deployments.
