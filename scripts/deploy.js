#!/usr/bin/env node

/**
 * RRDM Deployment Script
 * 
 * This script handles the deployment of the RRDM application.
 * It prepares the application for deployment by:
 * 1. Building the application
 * 2. Copying necessary assets
 * 3. Setting up environment variables
 * 4. Ensuring MongoDB connection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const config = {
  sourceDir: path.resolve(__dirname, '..'),
  buildDir: path.resolve(__dirname, '../build'),
  publicDir: path.resolve(__dirname, '../public'),
  viewsDir: path.resolve(__dirname, '../views'),
  assetsDir: path.resolve(__dirname, '../public/assets'),
  env: process.env.NODE_ENV || 'development'
};

/**
 * Main deployment function
 */
async function deploy() {
  try {
    console.log(`🚀 Starting RRDM ${config.env} Deployment`);
    
    // Clean build directory
    cleanBuildDir();
    
    // Create build directory structure
    await createBuildDirs();
    
    // Copy static assets
    await copyAssets();
    
    // Build the application
    buildApplication();
    
    // Set up environment variables
    setupEnvironment();
    
    console.log(`✅ RRDM ${config.env} Deployment completed successfully!`);
    console.log('');
    console.log('To start the application, run:');
    console.log('node server.js');
    console.log('');
    console.log('To deploy to production, merge the green branch to main:');
    console.log('git checkout main');
    console.log('git merge green');
    console.log('git push origin main');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean the build directory
 */
function cleanBuildDir() {
  try {
    if (fs.existsSync(config.buildDir)) {
      console.log('🗑️ Cleaning build directory');
      execSync(`rm -rf ${config.buildDir}`, { stdio: 'inherit' });
    }
  } catch (error) {
    throw new Error(`Failed to clean build directory: ${error.message}`);
  }
}

/**
 * Create build directory structure
 */
async function createBuildDirs() {
  try {
    console.log('📁 Creating build directory structure');
    
    // Create main build directory
    await mkdir(config.buildDir, { recursive: true });
    
    // Create other necessary directories
    const dirs = [
      path.join(config.buildDir, 'public'),
      path.join(config.buildDir, 'views'),
      path.join(config.buildDir, 'controllers'),
      path.join(config.buildDir, 'models'),
      path.join(config.buildDir, 'services'),
      path.join(config.buildDir, 'routes'),
      path.join(config.buildDir, 'config')
    ];
    
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
    }
    
    console.log('✅ Build directory structure created');
  } catch (error) {
    throw new Error(`Failed to create build directories: ${error.message}`);
  }
}

/**
 * Copy static assets
 */
async function copyAssets() {
  try {
    console.log('📦 Copying static assets');
    
    // Copy public directory
    await copyDir(config.publicDir, path.join(config.buildDir, 'public'));
    
    // Copy views directory
    await copyDir(config.viewsDir, path.join(config.buildDir, 'views'));
    
    console.log('✅ Static assets copied');
  } catch (error) {
    throw new Error(`Failed to copy assets: ${error.message}`);
  }
}

/**
 * Copy a directory recursively
 */
async function copyDir(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Build the application
 */
function buildApplication() {
  try {
    console.log('🔨 Building application');
    
    // Install dependencies
    console.log('📦 Installing dependencies');
    execSync('npm install --production', { stdio: 'inherit' });
    
    console.log('✅ Application built successfully');
  } catch (error) {
    throw new Error(`Failed to build application: ${error.message}`);
  }
}

/**
 * Set up environment variables
 */
function setupEnvironment() {
  try {
    console.log('🔧 Setting up environment variables');
    
    // Check if .env file exists
    const envPath = path.join(config.sourceDir, '.env');
    const envExamplePath = path.join(config.sourceDir, '.env.example');
    
    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      console.log('⚠️ No .env file found, creating from .env.example');
      fs.copyFileSync(envExamplePath, envPath);
    }
    
    // Set NODE_ENV to production
    process.env.NODE_ENV = 'production';
    
    console.log('✅ Environment variables set up');
  } catch (error) {
    throw new Error(`Failed to set up environment variables: ${error.message}`);
  }
}

// Run the deployment
deploy();
