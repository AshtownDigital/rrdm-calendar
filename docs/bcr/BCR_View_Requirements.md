
# BCR System – View Requirements

This document outlines all expected views (Nunjucks templates) for the BCR System, grouped by module. Each view serves a specific user-facing purpose and supports consistent feedback and interaction patterns.

---

## 1. BCR Submission Views  
**Folder:** `/views/bcr-submission/`

| View File        | Purpose                                 | Notes                                      |
|------------------|-----------------------------------------|--------------------------------------------|
| `new.njk`        | Public submission form                  | Uses CSRF, validation errors, GOV.UK form  |
| `confirm.njk`    | Success confirmation after submission   | Shows generated submissionCode             |
| `warning.njk`    | Error or blocked action notice          | Shown on invalid deletion or double submit |

---

## 2. BCR Management Views  
**Folder:** `/views/bcr/`

| View File        | Purpose                                 | Notes                                      |
|------------------|-----------------------------------------|--------------------------------------------|
| `view.njk`       | Full BCR detail display                 | Includes workflowHistory and status        |
| `update.njk`     | Phase update form                       | Dropdown for phase/status, comment input   |
| `confirm.njk`    | Success confirmation                    | Used after phase update or promotion       |
| `warning.njk`    | Error or permission warning             | For invalid phase transitions, etc.        |

---

## 3. Impacted Areas Views  
**Folder:** `/views/impacted-areas/`

| View File        | Purpose                                 | Notes                                      |
|------------------|-----------------------------------------|--------------------------------------------|
| `list.njk`       | Admin list of all areas                 | Shows name, description, edit/delete links |
| `new.njk`        | Form to create new area                 | Includes name, description, order          |
| `edit.njk`       | Edit existing area                      | Same fields as `new.njk`                   |
| `confirm.njk`    | Confirmation after save/delete          | Standard confirmation message              |
| `warning.njk`    | Shown when deletion is blocked          | E.g., when area is still in use            |

---

## 4. Shared View Behavior

- All forms must:
  - Include CSRF tokens
  - Display field-level validation errors
  - Use GOV.UK Design System components

- All confirmation pages must:
  - Display a heading
  - Provide a link to continue or return

- All warning pages must:
  - Use GOV.UK error message pattern
  - Clearly explain why the action is blocked

---

## 5. View Development Notes

- Base layout should use `layout.njk`
- Include standard partials:
  - Header, footer, breadcrumbs, flash messages
- Use `nunjucks-date-filter` for date formatting
- Status tags should follow GOV.UK color scheme

---

This set of view requirements ensures a consistent user experience and aligns with GOV.UK accessibility and usability standards.
