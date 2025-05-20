
# BCR System – Controller Requirements

This document defines the full functional requirements for each controller in the BCR system. Controllers are organized by feature area and are designed to follow RESTful principles, with separation of responsibilities and view logic.

---

## 1. BCR Submission Controller  
**Path:** `/controllers/bcr-submission/controller.js`

### `newForm(req, res)`
- Render the public submission form.
- View: `views/bcr-submission/new.njk`

### `create(req, res)`
- Accept form POST, validate and persist the submission.
- Validate required fields.
- Generate `recordNumber` and `submissionCode`.
- Save to database.
- On success: redirect to `confirm.njk`
- On error: re-render form with errors.

### `review(req, res)`
- Promote a valid submission to a BCR.
- Must check if not soft-deleted.
- Create new BCR and generate `bcrCode`.
- Redirect to BCR view or render warning on failure.

### `softDelete(req, res)`
- Mark a submission as deleted (set `deletedAt`).
- Show `confirm.njk` on success.
- Show `warning.njk` if already deleted.

### `hardDelete(req, res)`
- Permanently remove a soft-deleted submission.
- Show `confirm.njk` on success.
- Block and show `warning.njk` if not soft-deleted.

---

## 2. BCR Management Controllers  
**Folder:** `/controllers/bcr/`

### `viewController.js`

#### `view(req, res)`
- Show a BCR and its current phase, status, and workflow history.
- View: `views/bcr/view.njk`

### `updateController.js`

#### `updateForm(req, res)`
- Show the form for updating the current phase.
- View: `views/bcr/update.njk`

#### `update(req, res)`
- Accept and apply a phase update.
- Validate phase and status.
- Support `Completed` and `Skipped` states.
- Auto-advance to next phase if applicable.
- Log to `workflowHistory`.

### `workflowController.js`

#### `autoAdvancePhase(bcr)`
- Identify the next incomplete phase and mark it In Progress.

#### `logWorkflowHistory(bcr, update)`
- Append a structured record to `workflowHistory`.

---

## 3. Impacted Areas Controller  
**Path:** `/controllers/impacted-areas/controller.js`

### `list(req, res)`
- Render list of all impacted areas.
- View: `views/impacted-areas/list.njk`

### `newForm(req, res)`
- Show form to create a new area.
- View: `views/impacted-areas/new.njk`

### `create(req, res)`
- Validate and create a new area.
- On error: re-render with message.
- On success: redirect to list.

### `editForm(req, res)`
- Load and display edit form for existing area.
- View: `views/impacted-areas/edit.njk`

### `update(req, res)`
- Save edits to impacted area.
- Redirect on success or show validation errors.

### `delete(req, res)`
- Confirm and remove area.
- Prevent deletion if referenced in use.
- Show `warning.njk` on failure.

---

## 4. Controller Best Practices

| Concern        | Controller Responsibility                                     |
|----------------|---------------------------------------------------------------|
| CSRF           | Inject CSRF token on form views                               |
| Validations    | Perform server-side validations in all POST routes            |
| Errors         | Use `warning.njk` for logic or authorization failures         |
| Confirmations  | Use `confirm.njk` after successful create, update, or delete  |
| Logging        | Phase transitions must be logged to `workflowHistory`         |
| Reusability    | Move reusable logic (e.g. ID generation) to shared helpers    |

---

Controllers should remain lean, delegate non-trivial logic to helper or service layers, and use constants/enums for all controlled values.
