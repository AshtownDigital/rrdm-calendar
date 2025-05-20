// models/Submission.js
// Standalone model for BCR submissions

// Deprecated: Submission model is now managed by Prisma.
// Use `const { PrismaClient } = require('@prisma/client');` and access prisma.Submissions in your code.

// This file is kept for legacy compatibility. Remove all Mongoose usage from your codebase.
  submissionNumber: {
    type: String,
    unique: true
  },
  bcr: {
    type: Schema.Types.ObjectId,
    ref: 'Bcr',
    required: true
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'],
    default: 'draft'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  history: {
    type: Array,
    default: []
  },
  workflowHistory: {
    type: Array,
    default: []
  }
});

// Update the updatedAt field on save
SubmissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = Submission;
