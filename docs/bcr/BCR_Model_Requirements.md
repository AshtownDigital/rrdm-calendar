
# BCR System – Model Requirements

This document defines all data models used in the BCR (Business Change Request) system. Each model includes required fields, data types, enum values, validation rules, and special behaviors like code generation and soft deletion.

---

## 1. Shared Enums

Defined in `config/constants.js` and used across models for validation and consistency.

```js
URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical', 'Unknown'];

SUBMISSION_SOURCES = ['Internal', 'External', 'Other'];

ATTACHMENTS_OPTIONS = ['Yes', 'No'];

PHASE_STATUSES = ['Pending', 'In Progress', 'Completed', 'Skipped'];

WORKFLOW_PHASES = [
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
```

---

## 2. Model: BCR Submission

**File:** `/models/bcr-submission/model.js`

| Field Name                 | Type            | Required | Description                                      |
|----------------------------|-----------------|----------|--------------------------------------------------|
| recordNumber              | Integer          | Yes      | Auto-incremented, used in submissionCode         |
| submissionCode            | String           | Yes      | Format: `SUB-24/25-001`                          |
| id                        | UUID/String      | Yes      | Unique identifier                                |
| fullName                  | String           | Yes      | Max 60 characters                                |
| emailAddress              | String           | Yes      | Max 80 characters, must be a valid email         |
| submissionSource          | Enum             | Yes      | One of `SUBMISSION_SOURCES`                      |
| organisation              | String           | Cond.    | Required if source is 'Other'                    |
| briefDescription          | String           | Yes      | Max 500 characters                               |
| justification             | String           | Yes      | Explanation of change                            |
| urgencyLevel              | Enum             | Yes      | One of `URGENCY_LEVELS`                          |
| impactAreas               | Array<String>    | Yes      | References ImpactedArea IDs                      |
| affectedReferenceDataArea | String           | Optional | If applicable                                     |
| technicalDependencies     | String           | Optional | Notes on system dependency                       |
| relatedDocuments          | String           | Optional | URLs or references                               |
| attachments               | Enum             | Yes      | One of `ATTACHMENTS_OPTIONS`                     |
| additionalNotes           | String           | Optional | Free text                                        |
| declaration               | Boolean          | Yes      | Must be true                                     |
| deletedAt                 | Date/null        | No       | Set when soft-deleted                            |
| createdAt                 | Date             | Yes      | Set on creation                                  |
| updatedAt                 | Date             | Yes      | Updated automatically                            |

---

## 3. Model: BCR

**File:** `/models/bcr/model.js`

| Field Name        | Type              | Required | Description                                    |
|-------------------|-------------------|----------|------------------------------------------------|
| recordNumber      | Integer            | Yes      | Auto-incremented                               |
| bcrCode           | String             | Yes      | Format: `BCR-24/25-001`                         |
| id                | UUID/String        | Yes      | Unique identifier                              |
| submissionId      | UUID/String        | Yes      | Link to originating submission                 |
| currentPhase      | Enum               | Yes      | Current phase from `WORKFLOW_PHASES`           |
| status            | Enum               | Yes      | From `PHASE_STATUSES`                          |
| urgencyLevel      | Enum               | Yes      | From `URGENCY_LEVELS`                          |
| impactedAreas     | Array<String>      | Yes      | Referenced ImpactedArea IDs                    |
| workflowHistory   | Array<Object>      | Yes      | Audit trail of changes                         |
| createdAt         | Date               | Yes      | Set on creation                                |
| updatedAt         | Date               | Yes      | Updated on change                              |

**workflowHistory object:**
```js
{
  phase: String,        // From WORKFLOW_PHASES
  status: String,       // From PHASE_STATUSES
  comment: String,
  updatedBy: String,
  timestamp: Date
}
```

---

## 4. Model: Impacted Area

**File:** `/models/impacted-areas/model.js`

| Field Name   | Type         | Required | Description                                 |
|--------------|--------------|----------|---------------------------------------------|
| recordNumber | Integer      | Yes      | Auto-incremented for display order          |
| id           | UUID/String  | Yes      | Unique ID                                   |
| name         | String       | Yes      | Must be unique                              |
| description  | String       | Optional | Clarifies category                          |
| order        | Integer      | Yes      | Sorting order in UI                         |
| createdAt    | Date         | Yes      | Timestamp for creation                      |
| updatedAt    | Date         | Yes      | Timestamp for last update                   |

---

## 5. Code Generation Rules

- `submissionCode` and `bcrCode` must be generated in the format:
  - `PREFIX-YY/YY-NNN` (e.g., `SUB-24/25-001`, `BCR-24/25-001`)
  - Prefix is `SUB` or `BCR`
  - Year is based on UK academic year
  - NNN is the padded record number

---

## 6. System Behaviors

- `deletedAt` enables soft delete logic for submissions
- `workflowHistory` must be append-only
- Enum fields must be validated against shared lists
- All models include timestamp fields

---

These models form the data foundation of the BCR workflow system and are designed to be database-agnostic for use with Prisma, Sequelize, or similar.
