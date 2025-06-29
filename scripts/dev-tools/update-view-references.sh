#!/bin/bash
# Script to update controller references to views after flattening the modules directory
# Created: $(date)

ROOT_DIR="/Users/freddieo/Documents/rrdm"
CONTROLLERS_DIR="$ROOT_DIR/controllers"
ROUTES_DIR="$ROOT_DIR/routes"

echo "==== RRDM View Reference Update ===="
echo "Updating references from 'modules/[module]/' to '[module]/'"

# Create a backup of controllers and routes
backup_date=$(date +%Y%m%d)
mkdir -p "$ROOT_DIR/cleanup-backup/controllers-backup-$backup_date"
mkdir -p "$ROOT_DIR/cleanup-backup/routes-backup-$backup_date"
cp -r "$CONTROLLERS_DIR" "$ROOT_DIR/cleanup-backup/controllers-backup-$backup_date/"
cp -r "$ROUTES_DIR" "$ROOT_DIR/cleanup-backup/routes-backup-$backup_date/"
echo "Created backup of controllers and routes"

# Update controller references
echo "Updating controller references..."
find "$CONTROLLERS_DIR" -type f -name "*.js" -exec sed -i '' "s/render('modules\//render('/g" {} \;
find "$CONTROLLERS_DIR" -type f -name "*.js" -exec sed -i '' "s/render(\"modules\//render(\"/g" {} \;

# Update route references if needed
echo "Updating route references..."
find "$ROUTES_DIR" -type f -name "*.js" -exec sed -i '' "s/render('modules\//render('/g" {} \;
find "$ROUTES_DIR" -type f -name "*.js" -exec sed -i '' "s/render(\"modules\//render(\"/g" {} \;

# Update server.js if needed
echo "Checking server.js for references..."
sed -i '' "s/render('modules\//render('/g" "$ROOT_DIR/server.js"

echo ""
echo "Reference update complete!"
echo "All references to 'modules/' in view paths have been updated."
echo ""
echo "Backups were created in:"
echo "- $ROOT_DIR/cleanup-backup/controllers-backup-$backup_date/"
echo "- $ROOT_DIR/cleanup-backup/routes-backup-$backup_date/"
echo ""
echo "Please test the application to ensure all views are rendering correctly."
