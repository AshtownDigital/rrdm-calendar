/**
 * Submission model for MongoDB
 * Based on the Prisma Submission model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { generateSubmissionCode, getSubmitterTypeCode } = require('../utils/submissionCodeGenerator');

const SubmissionSchema = new Schema({
  recordNumber: {
    type: Number,
    unique: true
  },
  submissionCode: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      // This will be overridden in the pre-save hook with a proper code
      return `SUB-${Date.now()}`;
    }
  },
  fullName: {
    type: String,
    required: true,
    maxlength: 60
  },
  emailAddress: {
    type: String,
    required: true,
    maxlength: 80
  },
  submissionSource: {
    type: String,
    required: true
  },
  organisation: {
    type: String
  },
  briefDescription: {
    type: String,
    required: true,
    maxlength: 500
  },
  justification: {
    type: String,
    required: true
  },
  urgencyLevel: {
    type: String,
    required: true
  },
  otherUrgencyDescription: {
    type: String,
    // Only required if urgencyLevel is 'Other'
  },
  impactAreas: {
    type: [String],
    required: true
  },
  affectedReferenceDataArea: {
    type: String
  },
  technicalDependencies: {
    type: String
  },
  relatedDocuments: {
    type: String
  },
  attachments: {
    type: String,
    required: true
  },
  additionalNotes: {
    type: String
  },
  declaration: {
    type: Boolean,
    required: true
  },
  reviewOutcome: {
    type: String
  },
  reviewComments: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  submittedById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Rejected', 'Paused', 'Closed', 'More Info Required'],
    default: 'Pending'
  },
  bcrId: {
    type: Schema.Types.ObjectId,
    ref: 'Bcr'
  },
  bcrNumber: {
    type: String,
    sparse: true,
    // This will store the actual BCR number when a submission is approved
    // Format: BCR-YYYY-XXXX
  }
});

// Update the updatedAt field on save
SubmissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber and generate submission code
SubmissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Get the last submission to determine the next record number
      const lastSubmission = await this.constructor.findOne({}, {}, { sort: { 'recordNumber': -1 } });
      const nextRecordNumber = lastSubmission ? lastSubmission.recordNumber + 1 : 1;
      this.recordNumber = nextRecordNumber;
      
      // Always generate a proper submission code in the format SUB-24/25-001-INT
      // Get submitter type code based on submission source
      const submitterType = getSubmitterTypeCode(this.submissionSource);
      
      // Generate the submission code
      this.submissionCode = generateSubmissionCode({
        submitterType: submitterType,
        sequentialNumber: nextRecordNumber
      });
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Use a safer approach to prevent model compilation errors
let Submission;
try {
  // Try to get the existing model
  Submission = mongoose.model('Submission');
} catch (error) {
  // If the model doesn't exist, create it
  Submission = mongoose.model('Submission', SubmissionSchema);
}

module.exports = Submission;
