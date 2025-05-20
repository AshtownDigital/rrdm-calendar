/**
 * BCR System Constants
 * Central location for all enums and constants used in the BCR system
 */

// Urgency levels for BCR submissions and BCRs
const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical', 'Unknown'];

// Sources for BCR submissions
const SUBMISSION_SOURCES = ['Internal', 'External', 'Other'];

// Attachment options for BCR submissions
const ATTACHMENTS_OPTIONS = ['Yes', 'No'];

// Status options for phases in the workflow
const PHASE_STATUSES = ['Pending', 'In Progress', 'Completed', 'Skipped'];

// Workflow phases for the BCR process
const WORKFLOW_PHASES = [
  'Submit Form',
  'Prioritize',
  'Create Trello Card',
  'Review and Analyse',
  'Governance Playback',
  'Stakeholder Consultation',
  'Document Requirements',
  'Version Requirements',
  'Communication Requirements',
  'Approve Requirements',
  'Implement',
  'Release to Staging',
  'Release to Pre-Production',
  'Release to Production'
];

// Tag colors following GOV.UK Design System standards
const TAG_COLORS = {
  DEFAULT: 'govuk-tag',
  GREY: 'govuk-tag govuk-tag--grey',
  GREEN: 'govuk-tag govuk-tag--green',
  TURQUOISE: 'govuk-tag govuk-tag--turquoise',
  BLUE: 'govuk-tag govuk-tag--blue',
  LIGHT_BLUE: 'govuk-tag govuk-tag--light-blue',
  PURPLE: 'govuk-tag govuk-tag--purple',
  PINK: 'govuk-tag govuk-tag--pink',
  RED: 'govuk-tag govuk-tag--red',
  ORANGE: 'govuk-tag govuk-tag--orange',
  YELLOW: 'govuk-tag govuk-tag--yellow'
};

// Status to tag color mapping
const STATUS_TAG_COLORS = {
  'Pending': TAG_COLORS.GREY,
  'In Progress': TAG_COLORS.LIGHT_BLUE,
  'Completed': TAG_COLORS.GREEN,
  'Skipped': TAG_COLORS.YELLOW,
  'new': TAG_COLORS.BLUE,
  'new_submission': TAG_COLORS.BLUE,
  'draft': TAG_COLORS.GREY,
  'under_review': TAG_COLORS.LIGHT_BLUE,
  'being_prioritised': TAG_COLORS.LIGHT_BLUE,
  'under_technical_review': TAG_COLORS.LIGHT_BLUE,
  'in_governance_review': TAG_COLORS.LIGHT_BLUE,
  'approved': TAG_COLORS.GREEN,
  'implemented': TAG_COLORS.GREEN,
  'rejected': TAG_COLORS.RED
};

// Urgency level to tag color mapping
const URGENCY_TAG_COLORS = {
  'Low': TAG_COLORS.BLUE,
  'Medium': TAG_COLORS.YELLOW,
  'High': TAG_COLORS.ORANGE,
  'Critical': TAG_COLORS.RED,
  'Unknown': TAG_COLORS.GREY
};

module.exports = {
  URGENCY_LEVELS,
  SUBMISSION_SOURCES,
  ATTACHMENTS_OPTIONS,
  PHASE_STATUSES,
  WORKFLOW_PHASES,
  TAG_COLORS,
  STATUS_TAG_COLORS,
  URGENCY_TAG_COLORS
};
