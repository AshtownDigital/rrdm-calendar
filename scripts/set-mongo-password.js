/**
 * Set MongoDB Password Script
 * 
 * This script securely sets your MongoDB password in the .env file
 * and tests the connection without exposing the password in the code.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for password
function promptPassword() {
  return new Promise((resolve) => {
    rl.question('Enter your MongoDB password: ', (password) => {
      resolve(password);
    });
  });
}

// Update .env file with the password
function updateEnvFile(password) {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace <db_password> with the actual password
    envContent = envContent.replace(/<db_password>/g, password);
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with your MongoDB password');
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

// Test MongoDB connection
async function testConnection() {
  try {
    // Reload environment variables after update
    dotenv.config({ override: true });
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      return false;
    }
    
    console.log('Testing connection to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    
    if (mongoose.connection.readyState === 1) {
      const dbName = mongoose.connection.db.databaseName || 'unknown';
      console.log(`✅ Connection successful! Connected to database: ${dbName}`);
      
      // List collections
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections:`);
        collections.forEach(collection => {
          console.log(`- ${collection.name}`);
        });
      } catch (err) {
        console.log('Could not list collections, but connection is successful');
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.name === 'MongoServerError') {
      if (error.code === 8000 || error.message.includes('auth')) {
        console.error('Authentication failed. Please check your password.');
      } else if (error.code === 13) {
        console.error('Authorization failed. The user does not have permission to access the database.');
      }
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network error. Please check your internet connection and MongoDB Atlas network settings.');
    }
    
    return false;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

// Main function
async function main() {
  console.log('=== Set MongoDB Password ===');
  
  // Get password from user
  const password = await promptPassword();
  
  // Update .env file
  if (updateEnvFile(password)) {
    // Test connection
    await testConnection();
  }
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
