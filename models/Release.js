const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

const relatedDocSchema = new Schema({
  label: { type: String, trim: true },
  url: { type: String, trim: true }
}, { _id: false });

const releaseSchema = new Schema({
  ReleaseUUID: {
    type: String, // Mongoose schema type for UUID is String
    default: uuidv4,
    unique: true,
    required: true,
    index: true
  },
  RecordNumber: {
    type: Number,
    required: [true, 'Record number is required.']
  },
  AcademicYearID: {
    type: Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'AcademicYearID is required.']
  },
  AcademicYearName: {
    type: String,
    required: [true, 'AcademicYearName is required.'],
    trim: true,
    maxlength: [10, 'AcademicYearName cannot be more than 10 characters.'] // e.g., '25/26'
  },
  ReleaseCode: {
    type: String,
    required: [true, 'ReleaseCode is required.'],
    unique: true,
    trim: true,
    maxlength: [20, 'ReleaseCode cannot be more than 20 characters.'] // e.g., 25/26-001-BS
  },
  ReleaseType: {
    type: String,
    required: [true, 'ReleaseType is required.'],
    enum: ['AcademicYearBaseline', 'InYearPeriod', 'Adhoc'],
  },
  ReleaseNameDetails: { // Renamed from releaseName
    type: String,
    required: [true, 'Release name/details are required.'],
    trim: true,
    maxlength: [250, 'Release name/details cannot be more than 250 characters.']
  },
  Status: {
    type: String,
    required: [true, 'Status is required.'],
    enum: ['Planned', 'In Progress', 'Ready for Deployment', 'Deployed Successfully', 'Deployed with Issues', 'Postponed', 'Cancelled'],
    default: 'Planned'
  },
  ResponsibleTeamLead: {
    type: String,
    trim: true
  },
  ImpactAssessment: {
    type: String,
    trim: true
  },
  CommunicationSent: {
    type: Boolean,
    default: false
  },
  CommunicationLink: {
    type: String,
    trim: true // Consider adding a match for URL validation if strictness is needed
  },
  RelatedDocumentationLinks: [relatedDocSchema],
  GoLiveDate: {
    type: Date,
    required: [true, 'GoLiveDate is required.']
  },
  StartDate: {
    type: Date,
    required: [true, 'StartDate is required.']
  },
  EndDate: {
    type: Date,
    required: [true, 'EndDate is required.']
  },
  FreezeCutOffDate: {
    type: Date,
    required: [true, 'FreezeCutOffDate is required.']
  },
  Notes: {
    type: String,
    trim: true
  },
  CreatedByUserID: { // Renamed from createdBy
    type: Schema.Types.ObjectId, // Assuming UserID is an ObjectId, adjust if it's a String/UUID from another system
    ref: 'User', // Assuming a User model exists
    required: [true, 'CreatedByUserID is required.']
  },
  LastModifiedByUserID: { // Renamed from updatedBy
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'LastModifiedByUserID is required.']
  },
  IsArchived: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: { createdAt: 'CreatedDateTime', updatedAt: 'LastModifiedDateTime' } // Use Mongoose timestamps for CreatedDateTime and LastModifiedDateTime
});

// Virtual for IsAdhoc
releaseSchema.virtual('IsAdhoc').get(function() {
  return this.ReleaseType === 'Adhoc';
});

// Ensure virtuals are included in toJSON and toObject outputs
releaseSchema.set('toJSON', { virtuals: true });
releaseSchema.set('toObject', { virtuals: true });

// Indexes for performance
// ReleaseUUID is already indexed due to unique:true and index:true
releaseSchema.index({ AcademicYearID: 1, GoLiveDate: -1 }); // Common query: releases for an academic year, sorted by date
releaseSchema.index({ Status: 1 });
releaseSchema.index({ ReleaseCode: 1 }); // Already unique, but explicit index can be good
releaseSchema.index({ ReleaseType: 1 });
releaseSchema.index({ ReleaseNameDetails: 'text', Notes: 'text' }); // For text search
releaseSchema.index({ IsArchived: 1, GoLiveDate: -1 }); // For querying active releases

const Release = mongoose.model('Release', releaseSchema);

module.exports = Release;
