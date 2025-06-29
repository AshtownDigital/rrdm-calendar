/**
 * BCR Submission Model
 * Represents a submission in the BCR workflow process
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Submission Schema
 */
const SubmissionSchema = new Schema({
  bcrId: {
    type: Schema.Types.ObjectId,
    ref: 'BCR',
    required: true
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paused', 'on hold', 'more info required', 'closed'],
    default: 'pending'
  },
  comments: {
    type: String
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalname: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create the model
const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = Submission;
