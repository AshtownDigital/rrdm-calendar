
# BCR System – Route Requirements

This document defines all RESTful routes for the BCR system. Each route is grouped by functional area (submission, workflow management, impacted areas), and maps directly to its respective controller.

---

## 1. BCR Submission Routes  
**File:** `/routes/bcr-submission/routes.js`

| Method | Path                                    | Description                          | Controller Method     |
|--------|-----------------------------------------|--------------------------------------|------------------------|
| GET    | `/bcr-submission/new`                   | Show public submission form          | `newForm`              |
| POST   | `/bcr-submission`                       | Submit a new BCR                     | `create`               |
| POST   | `/bcr-submission/:id/review`            | Promote submission to BCR            | `review`               |
| POST   | `/bcr-submission/:id/delete`            | Soft-delete submission               | `softDelete`           |
| POST   | `/bcr-submission/:id/delete/permanent`  | Permanently delete a submission      | `hardDelete`           |

---

## 2. BCR Management Routes  
**File:** `/routes/bcr/routes.js`

| Method | Path                 | Description                           | Controller File / Method      |
|--------|----------------------|---------------------------------------|--------------------------------|
| GET    | `/bcr/:id`           | View BCR detail                       | `viewController.view`          |
| GET    | `/bcr/:id/update`    | Show phase update form                | `updateController.updateForm`  |
| POST   | `/bcr/:id/update`    | Submit phase update                   | `updateController.update`      |
| GET    | `/bcr/:id/confirm`   | Render confirmation view              | inline handler                 |
| GET    | `/bcr/:id/warning`   | Render warning view                   | inline handler                 |

---

## 3. Impacted Areas Routes  
**File:** `/routes/impacted-areas/routes.js`

| Method | Path                              | Description                          | Controller Method    |
|--------|-----------------------------------|--------------------------------------|-----------------------|
| GET    | `/impacted-areas`                 | List all impacted areas              | `list`                |
| GET    | `/impacted-areas/new`             | Show create form                     | `newForm`             |
| POST   | `/impacted-areas`                 | Create new impacted area             | `create`              |
| GET    | `/impacted-areas/:id/edit`        | Show edit form                       | `editForm`            |
| POST   | `/impacted-areas/:id/update`      | Submit updates                       | `update`              |
| POST   | `/impacted-areas/:id/delete`      | Delete an impacted area              | `delete`              |

---

## 4. Route Conventions

- All routes are grouped in `/routes/[module]/routes.js`
- Use consistent naming: GET for form/display, POST for changes
- Standard views: `confirm.njk`, `warning.njk`
- CSRF tokens required for all POST routes
- Route handlers must validate data, call controller logic, and provide user feedback

---

## 5. Route Loader

**File:** `/routes/index.js`

```js
const bcrRoutes = require('./bcr/routes');
const submissionRoutes = require('./bcr-submission/routes');
const impactedRoutes = require('./impacted-areas/routes');

module.exports = (app) => {
  app.use('/bcr', bcrRoutes);
  app.use('/bcr-submission', submissionRoutes);
  app.use('/impacted-areas', impactedRoutes);
};
```

---

This route map ensures full REST alignment, clarity, and consistent feedback handling across the system.
