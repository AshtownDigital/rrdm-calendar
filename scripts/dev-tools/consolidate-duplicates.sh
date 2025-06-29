#!/bin/bash
# Script to consolidate duplicate view directories in RRDM project
# Created: $(date)

ROOT_DIR="/Users/freddieo/Documents/rrdm"
VIEWS_DIR="$ROOT_DIR/views"
BACKUP_DIR="$ROOT_DIR/cleanup-backup/duplicate-views-backup-$(date +%Y%m%d)"

echo "==== RRDM View Duplication Consolidation ===="
echo "Creating backup directory at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

#######################################
# 1. Consolidate Reference Data directories
#######################################
echo "
[1] Consolidating Reference Data directories..."
# Backup reference-data
if [ -d "$VIEWS_DIR/reference-data" ]; then
  echo "   - Backing up reference-data directory..."
  cp -r "$VIEWS_DIR/reference-data" "$BACKUP_DIR/"
  
  # Move unique files from reference-data to ref-data
  echo "   - Moving unique files to ref-data directory..."
  if [ -d "$VIEWS_DIR/reference-data/release-notes" ]; then
    if [ ! -d "$VIEWS_DIR/ref-data/release-notes" ]; then
      mkdir -p "$VIEWS_DIR/ref-data/release-notes"
    fi
    
    for file in "$VIEWS_DIR/reference-data/release-notes"/*; do
      if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ ! -f "$VIEWS_DIR/ref-data/release-notes/$filename" ]; then
          cp "$file" "$VIEWS_DIR/ref-data/release-notes/"
          echo "   - Copied unique file: $filename"
        fi
      fi
    done
  fi
  
  # Remove the duplicate directory
  rm -rf "$VIEWS_DIR/reference-data"
  echo "   ✅ Removed redundant reference-data directory"
fi

#######################################
# 2. Consolidate Release Notes directories
#######################################
echo "
[2] Consolidating Release Notes directories..."
# Backup release-notes
if [ -d "$VIEWS_DIR/release-notes" ]; then
  echo "   - Backing up release-notes directory..."
  cp -r "$VIEWS_DIR/release-notes" "$BACKUP_DIR/"
  
  # Move unique files from release-notes to ref-data/release-notes
  echo "   - Moving unique files to ref-data/release-notes directory..."
  if [ ! -d "$VIEWS_DIR/ref-data/release-notes" ]; then
    mkdir -p "$VIEWS_DIR/ref-data/release-notes"
  fi
  
  for file in "$VIEWS_DIR/release-notes"/*; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      if [ ! -f "$VIEWS_DIR/ref-data/release-notes/$filename" ]; then
        cp "$file" "$VIEWS_DIR/ref-data/release-notes/"
        echo "   - Copied unique file: $filename"
      fi
    fi
  done
  
  # Remove the duplicate directory
  rm -rf "$VIEWS_DIR/release-notes"
  echo "   ✅ Removed redundant release-notes directory"
fi

#######################################
# 3. Consolidate Restore Points directories
#######################################
echo "
[3] Consolidating Restore Points directories..."
# Backup restore-points
if [ -d "$VIEWS_DIR/restore-points" ]; then
  echo "   - Backing up restore-points directory..."
  cp -r "$VIEWS_DIR/restore-points" "$BACKUP_DIR/"
  
  # Move unique files from restore-points to ref-data/restore-points
  echo "   - Moving unique files to ref-data/restore-points directory..."
  if [ ! -d "$VIEWS_DIR/ref-data/restore-points" ]; then
    mkdir -p "$VIEWS_DIR/ref-data/restore-points"
  fi
  
  for file in "$VIEWS_DIR/restore-points"/*; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      if [ ! -f "$VIEWS_DIR/ref-data/restore-points/$filename" ]; then
        cp "$file" "$VIEWS_DIR/ref-data/restore-points/"
        echo "   - Copied unique file: $filename"
      fi
    fi
  done
  
  # Remove the duplicate directory
  rm -rf "$VIEWS_DIR/restore-points"
  echo "   ✅ Removed redundant restore-points directory"
fi

#######################################
# 4. Consolidate Impact Areas directories
#######################################
echo "
[4] Consolidating Impact Areas directories..."
# Backup impacted-areas
if [ -d "$VIEWS_DIR/impacted-areas" ]; then
  echo "   - Backing up impacted-areas directory..."
  cp -r "$VIEWS_DIR/impacted-areas" "$BACKUP_DIR/"
  
  # Move unique files from impacted-areas to bcr/impact-areas
  echo "   - Moving unique files to bcr/impact-areas directory..."
  if [ ! -d "$VIEWS_DIR/bcr/impact-areas" ]; then
    mkdir -p "$VIEWS_DIR/bcr/impact-areas"
  fi
  
  for file in "$VIEWS_DIR/impacted-areas"/*; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      if [ ! -f "$VIEWS_DIR/bcr/impact-areas/$filename" ]; then
        cp "$file" "$VIEWS_DIR/bcr/impact-areas/"
        echo "   - Copied unique file: $filename"
      fi
    fi
  done
  
  # Remove the duplicate directory
  rm -rf "$VIEWS_DIR/impacted-areas"
  echo "   ✅ Removed redundant impacted-areas directory"
fi

#######################################
# 5. Update controller references
#######################################
echo "
[5] Updating controller references..."
# Backup controllers
mkdir -p "$BACKUP_DIR/controllers"
cp -r "$ROOT_DIR/controllers" "$BACKUP_DIR/"

# Update reference-data references
echo "   - Updating reference-data references..."
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render('reference-data\//render('ref-data\//g" {} \;
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render(\"reference-data\//render(\"ref-data\//g" {} \;

# Update release-notes references
echo "   - Updating release-notes references..."
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render('release-notes\//render('ref-data\/release-notes\//g" {} \;
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render(\"release-notes\//render(\"ref-data\/release-notes\//g" {} \;

# Update restore-points references
echo "   - Updating restore-points references..."
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render('restore-points\//render('ref-data\/restore-points\//g" {} \;
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render(\"restore-points\//render(\"ref-data\/restore-points\//g" {} \;

# Update impact-areas references
echo "   - Updating impact-areas references..."
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render('impacted-areas\//render('bcr\/impact-areas\//g" {} \;
find "$ROOT_DIR/controllers" -type f -name "*.js" -exec sed -i '' "s/render(\"impacted-areas\//render(\"bcr\/impact-areas\//g" {} \;

echo "
✅ Consolidation complete! All duplicate directories have been consolidated.
Backups were created in: $BACKUP_DIR

Updates made:
1. Reference Data: Consolidated to /views/ref-data
2. Release Notes: Consolidated to /views/ref-data/release-notes
3. Restore Points: Consolidated to /views/ref-data/restore-points
4. Impact Areas: Consolidated to /views/bcr/impact-areas

Please test the application to ensure all views are rendering correctly."
