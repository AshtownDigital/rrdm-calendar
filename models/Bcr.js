/**
 * BCR (Business Change Request) model for MongoDB
 * Based on the Prisma Bcr model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Enable debug logging for all queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`MongoDB Query: ${collectionName}.${method}`, JSON.stringify(query), doc || '');
});

const BcrSchema = new Schema({
  recordNumber: {
    type: Number,
    required: true
  },
  submissionId: {
    type: Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  currentPhaseId: {
    type: Schema.Types.ObjectId,
    ref: 'Phase',
    required: true
  },
  currentStatusId: {
    type: Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'New Submission'
  },
  bcrNumber: {
    type: String,
    required: true,
    unique: true
  },
  urgencyLevel: {
    type: String,
    required: true
  },
  impactedAreas: {
    type: [String],
    required: true
  },
  workflowHistory: {
    type: Schema.Types.Mixed,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for efficient querying
BcrSchema.index({ recordNumber: 1 });
BcrSchema.index({ status: 1 });
BcrSchema.index({ submissionId: 1 });

// Update the updatedAt field on save
BcrSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber with better error handling
BcrSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordNumber) {
    try {
      console.log('Auto-incrementing recordNumber for new BCR');
      const lastBcr = await this.constructor.findOne({}, {}, { sort: { 'recordNumber': -1 } })
        .maxTimeMS(5000) // Add timeout to prevent hanging
        .lean();
        
      console.log('Last BCR record found:', lastBcr ? `#${lastBcr.recordNumber}` : 'none');
      this.recordNumber = lastBcr ? lastBcr.recordNumber + 1 : 1;
      console.log('Assigned recordNumber:', this.recordNumber);
      next();
    } catch (error) {
      console.error('Error in BCR pre-save hook:', error);
      next(error);
    }
  } else {
    next();
  }
});

// Add static method to check database connection
BcrSchema.statics.checkConnection = async function() {
  try {
    // Check if we have a connection
    const connection = mongoose.connection;
    
    if (!connection) {
      return { 
        connected: false, 
        error: 'No MongoDB connection available',
        connectionState: 'disconnected'
      };
    }
    
    // Check connection state
    const state = connection.readyState;
    const stateName = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown';
    
    if (state !== 1) { // 1 = connected
      return { 
        connected: false, 
        error: `MongoDB is not connected. State: ${stateName} (${state})`,
        connectionState: stateName,
        readyState: state
      };
    }
    
    // Try to ping the database
    try {
      await connection.db.admin().ping();
      return { 
        connected: true,
        connectionState: stateName,
        readyState: state,
        dbName: connection.db.databaseName
      };
    } catch (pingError) {
      return { 
        connected: false, 
        error: `MongoDB ping failed: ${pingError.message}`,
        connectionState: stateName,
        readyState: state,
        pingError: pingError.message
      };
    }
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return { 
      connected: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      connectionState: 'error'
    };
  }
};

// Create the model if it doesn't exist
const Bcr = mongoose.models.Bcr || mongoose.model('Bcr', BcrSchema);

// Export the model
module.exports = Bcr;
