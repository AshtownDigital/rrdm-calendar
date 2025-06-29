#!/bin/bash
# Script to move all views/modules contents to views/ directory
# Created: $(date)

ROOT_DIR="/Users/freddieo/Documents/rrdm"
MODULES_DIR="$ROOT_DIR/views/modules"
VIEWS_DIR="$ROOT_DIR/views"
BACKUP_DIR="$ROOT_DIR/cleanup-backup/modules-backup-$(date +%Y%m%d)"

echo "==== RRDM Views Flattening Script ===="
echo "Moving views/modules/* into views/"

# Create backup of modules directory
mkdir -p "$BACKUP_DIR"
echo "Creating backup of modules directory to $BACKUP_DIR..."
cp -r "$MODULES_DIR" "$BACKUP_DIR/"

# Move each subdirectory from modules to views
echo "Moving subdirectories..."
for dir in "$MODULES_DIR"/*; do
  if [ -d "$dir" ]; then
    dirname=$(basename "$dir")
    
    # Check if directory already exists in views
    if [ -d "$VIEWS_DIR/$dirname" ]; then
      echo "⚠️ Directory $dirname already exists in views, merging contents..."
      
      # Move files from module directory to existing directory
      for file in "$dir"/*; do
        if [ -e "$file" ]; then
          filename=$(basename "$file")
          if [ -e "$VIEWS_DIR/$dirname/$filename" ]; then
            echo "  - Skipping $filename (already exists)"
          else
            mv "$file" "$VIEWS_DIR/$dirname/"
            echo "  - Moved $filename"
          fi
        fi
      done
    else
      # Move directory to views
      mv "$dir" "$VIEWS_DIR/"
      echo "✅ Moved $dirname"
    fi
  fi
done

# Remove the now empty modules directory
rmdir "$MODULES_DIR" 2>/dev/null || echo "Note: Modules directory not empty or already removed"

echo ""
echo "Move complete! All module directories have been moved to views/ and backed up to: $BACKUP_DIR"
echo ""
echo "Next steps: Update controller references from 'modules/[module]/' to '[module]/'"
