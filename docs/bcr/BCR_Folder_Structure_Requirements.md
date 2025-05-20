
# BCR System – Folder Structure Requirements

This document describes the full folder and file structure of the BCR system, following modular design and separation of concerns. Each module (bcr, bcr-submission, impacted-areas) is isolated across models, controllers, routes, views, and tests.

---

## Root-Level Folders

```
/controllers
/models
/routes
/views
/helpers
/middleware
/config
/public
/tests
```

---

## 1. /controllers

Controllers are grouped by module, each in its own subfolder. Larger modules have multiple files.

```
/controllers
  /bcr
    viewController.js
    updateController.js
    workflowController.js
    /tests
      viewController.test.js
  /bcr-submission
    controller.js
    /tests
      controller.test.js
  /impacted-areas
    controller.js
    /tests
      controller.test.js
```

---

## 2. /models

Each model resides in its own subfolder. Includes optional unit test stubs.

```
/models
  /bcr
    model.js
    /tests
      model.test.js
  /bcr-submission
    model.js
    /tests
      model.test.js
  /impacted-areas
    model.js
    /tests
      model.test.js
```

---

## 3. /routes

Routes are split per module and follow RESTful patterns. Use centralized route loader.

```
/routes
  /bcr
    routes.js
    /tests
      routes.test.js
  /bcr-submission
    routes.js
    /tests
      routes.test.js
  /impacted-areas
    routes.js
    /tests
      routes.test.js
  index.js           // Loads all route groups
```

---

## 4. /views

Views are organized per module. Shared views like `confirm.njk` and `warning.njk` are required for each.

```
/views
  /bcr
    view.njk
    update.njk
    confirm.njk
    warning.njk
  /bcr-submission
    new.njk
    confirm.njk
    warning.njk
  /impacted-areas
    list.njk
    new.njk
    edit.njk
    confirm.njk
    warning.njk
  layout.njk         // Base layout
  partials/          // Header, footer, etc.
```

---

## 5. /helpers

Utility functions for code generation, formatting, etc.

```
/helpers
  bcrUtils.js
  formatDate.js
```

---

## 6. /middleware

Custom middleware for CSRF, validation, etc.

```
/middleware
  csrf.js
  phaseValidation.js
```

---

## 7. /config

Stores constants and enums used throughout the system.

```
/config
  constants.js
  workflowMap.js
```

---

## 8. /public

Static assets like CSS and JS, following GOV.UK Frontend patterns.

```
/public
  /assets
    styles.css
    script.js
```

---

## 9. /tests

Shared testing utilities or global setup (optional).

```
/tests
  setup.js
  utils.js
```

---

This structure ensures maintainability, modularity, and scalability for the BCR system with clear conventions for features and cross-cutting concerns.
