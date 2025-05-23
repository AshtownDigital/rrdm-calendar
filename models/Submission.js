/**
 * Submission model for MongoDB
 * Based on the Prisma Submission model
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
  recordNumber: {
    type: Number,
    unique: true
  },
  submissionCode: {
    type: String,
    unique: true,
    required: true
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
  bcrId: {
    type: Schema.Types.ObjectId,
    ref: 'Bcr'
  }
});

// Update the updatedAt field on save
SubmissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-increment recordNumber
SubmissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const lastSubmission = await this.constructor.findOne({}, {}, { sort: { 'recordNumber': -1 } });
      this.recordNumber = lastSubmission ? lastSubmission.recordNumber + 1 : 1;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = Submission;
