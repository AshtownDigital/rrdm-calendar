# BCR Module Views Organization

This directory contains all view templates for the Business Change Request (BCR) module, organized into logical subfolders for better maintainability and clarity.

## Folder Structure

```
/views/modules/bcr/
├── submissions/          - All submission-related views
│   ├── list.njk          - List of submissions
│   ├── view.njk          - Detailed view of a submission
│   ├── view-basic.njk    - Basic submission view
│   ├── view-simple.njk   - Simple submission view
│   ├── new.njk           - New submission form
│   ├── edit.njk          - Edit submission form
│   ├── confirmation.njk  - Submission confirmation
│   ├── review.njk        - Review submission form
│   ├── submit.njk        - Submit form
│   ├── submit-new.njk    - New submission form
│   └── submit-updated.njk - Updated submission form
├── bcrs/                 - BCR-specific views
│   ├── index.njk         - List of BCRs
│   ├── view.njk          - BCR view
│   ├── details.njk       - Detailed BCR view
│   ├── update.njk        - Update BCR form
│   ├── update-form.njk   - Alternative update form
│   ├── update-status.njk - Status update form
│   ├── update-general.njk - General update form
│   ├── update-workflow.njk - Workflow update form
│   ├── assign-release.njk - Release assignment form
│   └── workflow-progress.njk - Workflow progress view
├── workflow/             - Workflow management views
│   ├── index.njk         - Main workflow view
│   ├── dynamic.njk       - Dynamic workflow visualization
│   └── reset-confirmation.njk - Reset workflow confirmation
├── prioritisation/       - Prioritisation-related views
│   ├── index.njk         - Main prioritisation view
│   ├── form.njk          - Prioritisation form
│   └── confirmation.njk  - Prioritisation confirmation
├── phase-status-mapping/ - Phase status mapping views
│   ├── index.njk         - Main phase status mapping view
│   └── update-confirmation.njk - Update confirmation
├── dashboard/            - Dashboard views
│   └── index.njk         - Main dashboard view
├── status/               - Module status views
│   └── index.njk         - Module status view
├── shared/               - Common components and templates
│   ├── confirmations/    - Confirmation templates
│   │   ├── generic.njk   - Generic confirmation
│   │   ├── archive.njk   - Archive confirmation
│   │   ├── delete.njk    - Delete confirmation
│   │   ├── confirm.njk   - Confirm action
│   │   └── update.njk    - Update confirmation
│   └── warnings/         - Warning templates
│       └── generic.njk   - Generic warning
└── impact-areas/         - Impact areas views
```

## Naming Conventions

1. Each subfolder contains templates related to a specific feature or functionality
2. Index files (index.njk) are used for main/list views in each subfolder
3. Shared components are placed in the shared/ folder for reuse across different views
4. View templates follow a consistent naming pattern:
   - list.njk - For list views
   - view.njk - For detailed views
   - new.njk - For creation forms
   - edit.njk - For edit forms
   - confirmation.njk - For confirmation pages

## Controller References

Controllers reference these templates using the path format:
```javascript
res.render('modules/bcr/[subfolder]/[template]', { ... });
```

For example:
```javascript
res.render('modules/bcr/submissions/list', { ... });
res.render('modules/bcr/bcrs/details', { ... });
res.render('modules/bcr/workflow/index', { ... });
```

## Maintenance Guidelines

1. When adding new templates, place them in the appropriate subfolder
2. Follow the established naming conventions
3. Update this documentation when adding new subfolders or changing the structure
4. Keep shared components in the shared/ folder to promote reuse
