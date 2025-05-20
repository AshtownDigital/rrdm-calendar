-- Update Submission model to match BCR_Model_Requirements.md
-- First, drop existing foreign key constraints to allow table modification
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_bcrId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_submittedById_fkey";

-- Create a temporary table with the new schema
CREATE TABLE "SubmissionNew" (
  "id" UUID NOT NULL,
  "recordNumber" SERIAL NOT NULL,
  "submissionCode" TEXT NOT NULL,
  "fullName" VARCHAR(60) NOT NULL,
  "emailAddress" VARCHAR(80) NOT NULL,
  "submissionSource" TEXT NOT NULL,
  "organisation" TEXT,
  "briefDescription" VARCHAR(500) NOT NULL,
  "justification" TEXT NOT NULL,
  "urgencyLevel" TEXT NOT NULL,
  "impactAreas" TEXT[] NOT NULL,
  "affectedReferenceDataArea" TEXT,
  "technicalDependencies" TEXT,
  "relatedDocuments" TEXT,
  "attachments" TEXT NOT NULL,
  "additionalNotes" TEXT,
  "declaration" BOOLEAN NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "submittedById" UUID NOT NULL,
  "bcrId" UUID,

  CONSTRAINT "SubmissionNew_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on submissionCode
CREATE UNIQUE INDEX "SubmissionNew_submissionCode_key" ON "SubmissionNew"("submissionCode");

-- Copy data from old table to new table (mapping existing fields)
INSERT INTO "SubmissionNew" ("id", "submissionCode", "fullName", "emailAddress", "submissionSource", 
                           "briefDescription", "justification", "urgencyLevel", "impactAreas", 
                           "attachments", "declaration", "createdAt", "updatedAt", "submittedById", "bcrId")
SELECT 
  "id", 
  "submissionNumber" AS "submissionCode", -- Map existing submissionNumber to submissionCode
  '' AS "fullName", -- Default value for required field
  '' AS "emailAddress", -- Default value for required field
  'Internal' AS "submissionSource", -- Default value for required field
  '' AS "briefDescription", -- Default value for required field
  "notes" AS "justification", -- Map existing notes to justification
  'Medium' AS "urgencyLevel", -- Default value for required field
  '{}' AS "impactAreas", -- Default empty array
  'No' AS "attachments", -- Default value for required field
  TRUE AS "declaration", -- Default value for required field
  "submissionDate" AS "createdAt", -- Map submission date to createdAt
  "submissionDate" AS "updatedAt", -- Map submission date to updatedAt
  "submittedById",
  "bcrId"
FROM "Submission";

-- Drop the old table
DROP TABLE "Submission";

-- Rename the new table to the original name
ALTER TABLE "SubmissionNew" RENAME TO "Submission";

-- Add back foreign key constraints
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" 
  FOREIGN KEY ("submittedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bcrId_fkey" 
  FOREIGN KEY ("bcrId") REFERENCES "Bcrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Submission_bcrId_idx" ON "Submission"("bcrId");
CREATE INDEX "Submission_submittedById_idx" ON "Submission"("submittedById");
CREATE INDEX "Submission_recordNumber_idx" ON "Submission"("recordNumber");
