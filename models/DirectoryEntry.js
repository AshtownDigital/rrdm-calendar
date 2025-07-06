/**
 * DirectoryEntry model – unified reference-data directory item.
 *
 * The directory view ( /reference-data/directory ) displays a flat list of
 * these entries, one document per “code” in each reference-data category.
 *
 * Schema mirrors the structure produced by getDirectoryData():
 *   fieldName    – top-level category e.g. "Nationality", "Training Route".
 *   code         – short identifier (string) unique within category.
 *   label        – human-readable description for UI.
 *   academicYear – string e.g. "25/26".
 *   status       – one of "new", "no-change", "removed".
 *
 * A compound unique index on { fieldName, code, academicYear } avoids
 * duplication across refresh jobs.
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DirectoryEntrySchema = new Schema(
  {
    fieldName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    status: {
      type: String,
      enum: ['new', 'no-change', 'removed'],
      required: true
    }
  },
  {
    timestamps: true // adds createdAt/updatedAt
  }
);

// Prevent duplicates for the same code within a category & academic year.
DirectoryEntrySchema.index({ fieldName: 1, code: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('DirectoryEntry', DirectoryEntrySchema);
