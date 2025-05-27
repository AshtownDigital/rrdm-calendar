/**
 * MongoDB Connection Diagnostic Tool
 * This script performs a comprehensive diagnosis of MongoDB connection issues
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Extract hostname from MongoDB URI
function extractHostname(uri) {
  const match = uri.match(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@([^\/\?]+)/);
  return match ? match[2] : null;
}

// Check DNS resolution
async function checkDNS(hostname) {
  console.log(`\n🔍 Checking DNS resolution for ${hostname}...`);
  try {
    const addresses = await promisify(dns.resolve)(hostname);
    console.log(`✅ DNS resolution successful: ${addresses.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    return false;
  }
}

// Check network connectivity
async function checkConnectivity(hostname) {
  console.log(`\n🔍 Checking network connectivity to ${hostname}...`);
  try {
    const { stdout } = await execAsync(`ping -c 3 ${hostname}`);
    console.log(`✅ Network connectivity successful:\n${stdout.split('\n').slice(-3).join('\n')}`);
    return true;
  } catch (error) {
    console.error(`❌ Network connectivity failed: ${error.message}`);
    return false;
  }
}

// Test MongoDB connection with different options
async function testMongoConnection(uri, options = {}, label = 'Default') {
  console.log(`\n🔍 Testing MongoDB connection with ${label} options...`);
  
  try {
    console.log(`Connecting with options: ${JSON.stringify(options, null, 2)}`);
    const startTime = Date.now();
    const conn = await mongoose.createConnection(uri, options).asPromise();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Connection successful (${duration}ms)`);
    console.log(`Connection state: ${conn.readyState}`);
    
    try {
      // Try to list collections to verify full access
      const collections = await conn.db.listCollections().toArray();
      console.log(`Available collections: ${collections.map(c => c.name).join(', ')}`);
    } catch (error) {
      console.error(`❌ Could not list collections: ${error.message}`);
    }
    
    // Close the connection
    await conn.close();
    console.log('Connection closed successfully');
    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    if (error.name === 'MongoServerSelectionError') {
      console.error('This is typically caused by network issues or IP whitelisting problems');
    }
    return false;
  }
}

// Main diagnostic function
async function diagnoseMongoDBConnection() {
  console.log('=== MongoDB Connection Diagnostic Tool ===');
  
  // Get MongoDB URI
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    return;
  }
  
  console.log(`MongoDB URI: ${uri.substring(0, uri.indexOf('://') + 3)}***`);
  
  // Extract hostname from URI
  const hostname = extractHostname(uri);
  if (!hostname) {
    console.error('❌ Could not extract hostname from MongoDB URI');
    return;
  }
  
  // Check DNS resolution
  const dnsOk = await checkDNS(hostname);
  
  // Check network connectivity
  const connectivityOk = await checkConnectivity(hostname);
  
  // Test with different connection options
  const basicOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  };
  
  const standardOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    bufferCommands: true,
    bufferTimeoutMS: 30000
  };
  
  const relaxedOptions = {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 90000,
    connectTimeoutMS: 60000,
    bufferCommands: true,
    bufferTimeoutMS: 60000,
    ssl: false,
    family: 4
  };
  
  // Test connections
  await testMongoConnection(uri, basicOptions, 'Basic');
  await testMongoConnection(uri, standardOptions, 'Standard');
  await testMongoConnection(uri, relaxedOptions, 'Relaxed');
  
  console.log('\n=== Diagnosis Summary ===');
  console.log(`DNS Resolution: ${dnsOk ? '✅ Successful' : '❌ Failed'}`);
  console.log(`Network Connectivity: ${connectivityOk ? '✅ Successful' : '❌ Failed'}`);
  
  console.log('\n=== Recommendations ===');
  if (!dnsOk) {
    console.log('- Check your internet connection');
    console.log('- Verify the MongoDB Atlas cluster hostname is correct');
  }
  
  if (!connectivityOk) {
    console.log('- Check if your network allows outbound connections to MongoDB Atlas');
    console.log('- Verify firewall settings are not blocking connections');
  }
  
  console.log('- Ensure your IP address is whitelisted in MongoDB Atlas');
  console.log('- Check if MongoDB Atlas is experiencing any service disruptions');
  console.log('- Verify your MongoDB Atlas username and password are correct');
}

// Run the diagnostic
diagnoseMongoDBConnection().catch(error => {
  console.error('Diagnostic failed:', error);
});
