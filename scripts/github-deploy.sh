#!/bin/bash

# GitHub Deploy Script for RRDM
# This script helps deploy the RRDM application to GitHub

# Configuration
REPO_NAME="rrdm"
BRANCH="green"
GITHUB_USERNAME="cnkinfolks-projects"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== RRDM GitHub Deployment ===${NC}"
echo ""

# Get GitHub username if not provided
if [ -z "$GITHUB_USERNAME" ]; then
  echo -e "${YELLOW}Enter your GitHub username:${NC}"
  read GITHUB_USERNAME
  
  if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}Error: GitHub username is required.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Setting up GitHub repository for ${GITHUB_USERNAME}/${REPO_NAME}${NC}"

# Create a new GitHub repository using the GitHub API
echo -e "${YELLOW}Do you want to create a new GitHub repository? (y/n)${NC}"
read CREATE_REPO

if [ "$CREATE_REPO" = "y" ]; then
  echo -e "${YELLOW}Is this repository public or private? (public/private)${NC}"
  read REPO_VISIBILITY
  
  if [ "$REPO_VISIBILITY" != "public" ] && [ "$REPO_VISIBILITY" != "private" ]; then
    REPO_VISIBILITY="private"
  fi
  
  echo -e "${GREEN}Creating a new ${REPO_VISIBILITY} GitHub repository: ${GITHUB_USERNAME}/${REPO_NAME}${NC}"
  echo -e "${YELLOW}Please create this repository on GitHub.com before continuing.${NC}"
  echo -e "${YELLOW}Visit: https://github.com/new${NC}"
  echo -e "${YELLOW}Repository name: ${REPO_NAME}${NC}"
  echo -e "${YELLOW}Visibility: ${REPO_VISIBILITY}${NC}"
  echo -e "${YELLOW}Do NOT initialize with README, .gitignore, or license${NC}"
  echo ""
  echo -e "${YELLOW}Press Enter when you've created the repository...${NC}"
  read
fi

# Set up the remote URL
echo -e "${GREEN}Setting up remote URL${NC}"
git remote set-url origin https://github.com/CNKinfolks/rrdm.git

# Verify the remote URL
echo -e "${GREEN}Verifying remote URL${NC}"
git remote -v

# Push to GitHub
echo -e "${GREEN}Pushing ${BRANCH} branch to GitHub${NC}"
echo -e "${YELLOW}You will be prompted for your GitHub credentials${NC}"
echo -e "${YELLOW}If you have 2FA enabled, use a personal access token instead of your password${NC}"
echo ""

git push -u origin ${BRANCH}

# Check if push was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully pushed ${BRANCH} branch to GitHub!${NC}"
  echo -e "${GREEN}Repository URL: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
  echo ""
  echo -e "${GREEN}To view your repository, visit:${NC}"
  echo -e "${GREEN}https://github.com/${GITHUB_USERNAME}/${REPO_NAME}${NC}"
else
  echo -e "${RED}Failed to push to GitHub. Please check your credentials and try again.${NC}"
  echo -e "${YELLOW}If you have 2FA enabled, you need to use a personal access token.${NC}"
  echo -e "${YELLOW}Create one at: https://github.com/settings/tokens${NC}"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
