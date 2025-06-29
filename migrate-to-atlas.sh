#!/bin/bash

# MongoDB data migration script for RRDM
# Exports data from local MongoDB and imports it to MongoDB Atlas

# Exit on error
set -e

# Configuration - REPLACE THESE VALUES
ATLAS_USERNAME="rrdm-app"  # MongoDB Atlas username
ATLAS_PASSWORD="6qT7PVQReKGPYpLY"  # Your MongoDB Atlas password
LOCAL_DB_NAME="rrdm-dev"  # Your local database name
ATLAS_DB_NAME="rrdm"      # Your target Atlas database name

# MongoDB URIs
LOCAL_URI="mongodb://localhost:27017/${LOCAL_DB_NAME}"
ATLAS_URI="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@rrdm-cluster.evfi6hl.mongodb.net/${ATLAS_DB_NAME}?retryWrites=true&w=majority&appName=rrdm-cluster"

# Create dump directory
DUMP_DIR="./mongo-dump"
mkdir -p ${DUMP_DIR}

echo "====== RRDM MongoDB Migration to Atlas ======"

# 1. Check if mongodump and mongorestore are available
echo "Checking for required MongoDB tools..."
if ! command -v mongodump &> /dev/null; then
  echo "mongodump command not found. Please install MongoDB Database Tools."
  exit 1
fi

if ! command -v mongorestore &> /dev/null; then
  echo "mongorestore command not found. Please install MongoDB Database Tools."
  exit 1
fi

# 2. Export data from local MongoDB
echo -e "\n1. Exporting data from local MongoDB..."
mongodump --uri="${LOCAL_URI}" --out="${DUMP_DIR}"

# 3. Import data to MongoDB Atlas
echo -e "\n2. Importing data to MongoDB Atlas..."
mongorestore --uri="${ATLAS_URI}" "${DUMP_DIR}/${LOCAL_DB_NAME}" --drop

echo -e "\n====== Migration Completed Successfully ======"
echo "Your data has been migrated to MongoDB Atlas"
echo "You can now deploy your RRDM application to Google Cloud Run"
