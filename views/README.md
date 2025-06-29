# RRDM Views Structure

This directory contains all views for the RRDM application. The view structure follows a modular pattern, with most features organized under the `modules` directory.

## Directory Structure

- `/views/modules/` - Main location for feature-specific views organized by module
  - `/views/modules/bcr/` - Business Change Request related views
  - `/views/modules/home/` - Homepage views
  - `/views/modules/funding/` - Funding management views
  - `/views/modules/ref-data/` - Reference data management views
  - etc.

- `/views/layouts/` - Layout templates used across the application
- `/views/partials/` - Reusable view components
- `/views/components/` - GOV.UK Design System components
- `/views/errors/` - Error page templates

## View Patterns

1. **Module-first Structure**
   - Views are organized by feature/module in `/views/modules/`
   - Each module can have its own internal structure

2. **Consistent Extension**
   - `.njk` - Nunjucks templates
   - `.ejs` - Legacy EJS templates (being phased out)

3. **Common Naming Patterns**
   - `index.njk` - Main/landing page for a section
   - `list.njk` - List views
   - `view.njk` - Detail views
   - `new.njk`, `edit.njk` - Form views

## Recent Consolidation

The views directory was recently consolidated to remove redundancy:

- Old `/views/bcr/` and `/views/bcr-submission/` directories were moved to the modular structure in `/views/modules/bcr/`
- Controllers were updated to reference the new paths
- Backups of the old structure are available in `/cleanup-backup/views-backup/`

## Best Practices

1. Place new views in the appropriate module directory
2. Use standard layouts and partials for consistency
3. Follow GOV.UK Design System patterns
