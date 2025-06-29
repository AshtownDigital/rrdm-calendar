#!/bin/bash

# GCP Deployment Script for RRDM Application
# This script automates the deployment of RRDM to Google Cloud Run with MongoDB Atlas

# Exit on error
set -e

# Configuration - REPLACE THESE VALUES
GCP_PROJECT_ID="rrdm-462410"  # Your GCP project ID
GCP_REGION="europe-west2"              # Your preferred region
MONGODB_USERNAME="rrdm-app"      # Your MongoDB Atlas username

# MongoDB Atlas connection string (with password from environment)
MONGODB_URI="mongodb+srv://${MONGODB_USERNAME}:6qT7PVQReKGPYpLY@rrdm-cluster.evfi6hl.mongodb.net/rrdm?retryWrites=true&w=majority&appName=rrdm-cluster"

echo "====== RRDM GCP Deployment ======"
echo "This script will deploy RRDM to Google Cloud Run"

# 1. Ensure gcloud is authenticated and project is set
echo -e "\n1. Setting up Google Cloud environment..."
gcloud config set project ${GCP_PROJECT_ID}

# 2. Enable required Google Cloud APIs
echo -e "\n2. Enabling required Google Cloud APIs..."
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com

# 3. Create Artifact Registry repository if it doesn't exist
echo -e "\n3. Setting up Artifact Registry..."
gcloud artifacts repositories create rrdm-images \
    --repository-format=docker \
    --location=${GCP_REGION} \
    --description="RRDM application images" || echo "Repository already exists"

# 4. Configure Docker for Artifact Registry
echo -e "\n4. Configuring Docker authentication..."
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev

# 5. Build and push Docker image
echo -e "\n5. Building and pushing Docker image..."
docker build -t ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/rrdm-images/rrdm-app:latest .
docker push ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/rrdm-images/rrdm-app:latest

# 6. Deploy to Cloud Run
echo -e "\n6. Deploying to Cloud Run..."
gcloud run deploy rrdm-service \
    --image=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/rrdm-images/rrdm-app:latest \
    --platform=managed \
    --region=${GCP_REGION} \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=1 \
    --set-env-vars="MONGODB_URI=${MONGODB_URI},NODE_ENV=production,DISABLE_FILE_WATCHING=true" \
    --allow-unauthenticated \
    --port=8080

# 7. Get the service URL
echo -e "\n7. Deployment complete! Your service URL is:"
gcloud run services describe rrdm-service --region=${GCP_REGION} --format='value(status.url)'

echo -e "\n====== Deployment Completed Successfully ======"
echo "Note: Make sure your MongoDB Atlas network access allows connections from your Cloud Run service"
