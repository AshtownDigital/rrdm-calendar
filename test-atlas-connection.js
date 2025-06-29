const mongoose = require('mongoose');

// Replace <your_username> with your actual MongoDB Atlas username
// MongoDB Atlas connection string with actual username
const MONGODB_URI = "mongodb+srv://rrdm-app:6qT7PVQReKGPYpLY@rrdm-cluster.evfi6hl.mongodb.net/rrdm?retryWrites=true&w=majority&appName=rrdm-cluster";

async function testConnection() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Successfully connected to MongoDB Atlas!');
    
    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\nConnection closed.');
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
  }
}

testConnection();
