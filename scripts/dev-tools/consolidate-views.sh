#!/bin/bash
# Script to consolidate redundant view directories in RRDM project
# Created: $(date)

# Define backup directory
BACKUP_DIR="/Users/freddieo/Documents/rrdm/cleanup-backup/views-backup"
ROOT_DIR="/Users/freddieo/Documents/rrdm"

# Make sure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "==== RRDM View Consolidation ===="
echo "Backing up and moving redundant view directories..."

# Check if files were already backed up
if [ -d "$BACKUP_DIR/bcr" ] && [ -d "$BACKUP_DIR/bcr-submission" ]; then
  echo "Backup already exists, not creating new backup"
else
  echo "Creating backup of view directories..."
  cp -r "$ROOT_DIR/views/bcr" "$BACKUP_DIR/" 2>/dev/null || echo "bcr directory already backed up or doesn't exist"
  cp -r "$ROOT_DIR/views/bcr-submission" "$BACKUP_DIR/" 2>/dev/null || echo "bcr-submission directory already backed up or doesn't exist"
fi

echo "Moving redundant directories to backup..."
# Move directories to backup (if they exist)
if [ -d "$ROOT_DIR/views/bcr" ]; then
  echo "Moving /views/bcr to backup..."
  mv "$ROOT_DIR/views/bcr" "$BACKUP_DIR/bcr-$(date +%Y%m%d)" 
  echo "✅ Moved BCR views"
fi

if [ -d "$ROOT_DIR/views/bcr-submission" ]; then
  echo "Moving /views/bcr-submission to backup..."
  mv "$ROOT_DIR/views/bcr-submission" "$BACKUP_DIR/bcr-submission-$(date +%Y%m%d)"
  echo "✅ Moved BCR submission views"
fi

echo ""
echo "Consolidation complete! All redundant views have been backed up to: $BACKUP_DIR"
echo "The modular structure in /views/modules/ is now the primary view location."
echo ""
echo "If you encounter any missing views, you can find the original files in the backup directory."
