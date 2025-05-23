/**
 * Update MongoDB Credentials Script
 * 
 * This script helps update MongoDB credentials in the .env file
 * and tests the connection to ensure it works properly.
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

// Prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Test MongoDB connection with given URI
async function testConnection(uri) {
  try {
    console.log('Testing connection to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    
    if (mongoose.connection.readyState === 1) {
      const dbName = mongoose.connection.db.databaseName;
      console.log(`✅ Connection successful! Connected to database: ${dbName}`);
      
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Found ${collections.length} collections:`);
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.name === 'MongoServerError') {
      if (error.code === 8000 || error.message.includes('auth')) {
        console.error('Authentication failed. Please check your username and password.');
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

// Update .env file with new MongoDB URI
function updateEnvFile(uri) {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check if MONGODB_URI already exists
      if (envContent.includes('MONGODB_URI=')) {
        // Replace existing MONGODB_URI
        envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${uri}`);
      } else {
        // Add MONGODB_URI to the end
        envContent += `\nMONGODBURI=${uri}\n`;
      }
    } else {
      // Create new .env file
      envContent = `MONGODB_URI=${uri}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with new MongoDB URI');
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== MongoDB Credentials Update ===');
  
  // Get current MongoDB URI if it exists
  const currentUri = process.env.MONGODB_URI || '';
  if (currentUri) {
    console.log('Current MongoDB URI is set in environment variables.');
    const testCurrent = await prompt('Would you like to test the current connection? (y/n): ');
    
    if (testCurrent.toLowerCase() === 'y') {
      await testConnection(currentUri);
    }
  } else {
    console.log('No MongoDB URI found in environment variables.');
  }
  
  // Ask for new credentials
  console.log('\nPlease enter your MongoDB Atlas connection details:');
  const username = await prompt('Username: ');
  const password = await prompt('Password: ');
  const cluster = await prompt('Cluster (e.g., cluster0.abc123): ');
  const database = await prompt('Database name: ');
  
  // Construct MongoDB URI
  const newUri = `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/${database}?retryWrites=true&w=majority`;
  
  // Test new connection
  const connectionSuccess = await testConnection(newUri);
  
  if (connectionSuccess) {
    const updateEnv = await prompt('Would you like to update your .env file with these credentials? (y/n): ');
    
    if (updateEnv.toLowerCase() === 'y') {
      updateEnvFile(newUri);
    }
  } else {
    console.log('Please check your credentials and try again.');
  }
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
