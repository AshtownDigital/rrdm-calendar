const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Stores the User's ID (e.g., UUID or ObjectId as string)
  username: { type: String, required: true }, // Or just store username if User model is not integrated yet
  timestamp: { type: Date, default: Date.now },
  action: { type: String, required: true }, // e.g., 'Created', 'Updated Status to Current', 'Start Date Changed'
  changes: [{ 
    field: String, 
    oldValue: mongoose.Schema.Types.Mixed, 
    newValue: mongoose.Schema.Types.Mixed 
  }]
}, { _id: false });

const academicYearSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: [true, 'Start Date is required.'],
    unique: true,
    validate: {
      validator: function(date) {
        // Check if the date is a Date object and if it's September 1st
        return date instanceof Date && date.getUTCMonth() === 8 && date.getUTCDate() === 1;
      },
      message: 'Start Date must be September 1st.'
    }
  },
  endDate: {
    type: Date
    // Not required, will be derived
  },
  name: {
    type: String,
    trim: true
    // Not required directly, will be derived. Uniqueness enforced by startDate.
  },
  code: {
    type: String,
    trim: true
    // Not required directly, will be derived. Uniqueness enforced by startDate.
  },
  fullName: {
    type: String,
    trim: true
    // Not required directly, will be derived. Uniqueness enforced by startDate.
  },
  uuid: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  // recordNumber removed as it's auto-generated and form fields are being simplified
  status: {
    type: String,
    required: true,
    enum: {
      values: ['Future', 'Current', 'Next', 'Past', 'Archived'], // Consider if 'Next' is still needed
      message: '{VALUE} is not a supported status.'
    },
    default: 'Future'
  },
  auditLog: [auditLogSchema],
  academicBreaks: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true, required: false }
    // Add validation: endDate must be >= startDate for each break
  }]
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Pre-save hook to derive fields and validate dates
academicYearSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate')) {
    if (!this.startDate) {
      // This should ideally be caught by 'required' but as a safeguard:
      return next(new Error('Start Date is required to generate academic year details.'));
    }

    // Ensure startDate is a Date object and set to UTC midnight to avoid timezone issues
    // The validator should ensure it's a Sept 1st already.
    const start = new Date(this.startDate.toISOString().slice(0,10)); // Keep only date part, effectively UTC midnight
    start.setUTCHours(0,0,0,0);

    if (start.getUTCMonth() !== 8 || start.getUTCDate() !== 1) {
      // This error will be caught by the schema validator too, but good to have a specific check here.
      const err = new Error('Start Date must be September 1st.');
      this.invalidate('startDate', 'Start Date must be September 1st.', this.startDate);
      return next(err);
    }

    const startYear = start.getUTCFullYear();
    const endYear = startYear + 1;

    // Set endDate to August 31st of the next year, UTC midnight
    this.endDate = new Date(Date.UTC(endYear, 7, 31)); // Month is 0-indexed, so 7 is August

    // Generate name, code, fullName
    const shortStartYear = startYear.toString().slice(-2);
    const shortEndYear = endYear.toString().slice(-2);

    this.name = `${shortStartYear}/${shortEndYear}`;
    this.code = `AY${shortStartYear}/${shortEndYear}`;
    this.fullName = `${startYear}/${endYear}`;
  }
  
  // General validation: ensure endDate is after startDate (even if both are provided manually, though less likely now)
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'End Date must be after Start Date.');
    // No need to call next(err) here as invalidate sets the validation error for Mongoose to handle
  }

  next();
});

// Method to add to audit log
academicYearSchema.methods.addToAuditLog = function(userId, username, action, changes = []) {
  this.auditLog.push({ userId, username, action, changes });
};

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

module.exports = AcademicYear;
