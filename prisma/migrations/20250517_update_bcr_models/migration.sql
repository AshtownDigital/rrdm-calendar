-- Migration to update BCR models according to BCR_Model_Requirements.md

-- 1. Create a new ImpactedArea model
CREATE TABLE IF NOT EXISTS "ImpactedArea" (
  "id" UUID NOT NULL PRIMARY KEY,
  "recordNumber" SERIAL NOT NULL,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL
);

-- 2. Update the Submission model
-- First, drop existing foreign key constraints to allow table modification
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_bcrId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_submittedById_fkey";

-- Create a temporary table with the new schema
CREATE TABLE "SubmissionNew" (
  "id" UUID NOT NULL PRIMARY KEY,
  "recordNumber" SERIAL NOT NULL,
  "submissionCode" TEXT NOT NULL UNIQUE,
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
  "submittedById" UUID NOT NULL
);

-- Create unique constraint on submissionCode
CREATE UNIQUE INDEX "SubmissionNew_submissionCode_key" ON "SubmissionNew"("submissionCode");

-- Copy data from old table to new table (mapping existing fields)
INSERT INTO "SubmissionNew" (
  "id", 
  "submissionCode", 
  "fullName", 
  "emailAddress", 
  "submissionSource", 
  "briefDescription", 
  "justification", 
  "urgencyLevel", 
  "impactAreas", 
  "attachments", 
  "declaration", 
  "createdAt", 
  "updatedAt", 
  "submittedById"
)
SELECT 
  "id", 
  COALESCE("submissionNumber", CONCAT('SUB-', TO_CHAR(NOW(), 'YY/YY'), '-', LPAD(CAST(ROW_NUMBER() OVER () AS TEXT), 3, '0'))), 
  '' AS "fullName", 
  '' AS "emailAddress", 
  'Internal' AS "submissionSource", 
  '' AS "briefDescription", 
  COALESCE("notes", '') AS "justification", 
  'Medium' AS "urgencyLevel", 
  '{}' AS "impactAreas", 
  'No' AS "attachments", 
  TRUE AS "declaration", 
  COALESCE("submissionDate", NOW()) AS "createdAt", 
  COALESCE("submissionDate", NOW()) AS "updatedAt", 
  "submittedById"
FROM "Submission";

-- Drop the old table
DROP TABLE IF EXISTS "Submission";

-- Rename the new table to the original name
ALTER TABLE "SubmissionNew" RENAME TO "Submission";

-- Add foreign key constraint for submittedById
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" 
  FOREIGN KEY ("submittedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Submission_submittedById_idx" ON "Submission"("submittedById");
CREATE INDEX "Submission_recordNumber_idx" ON "Submission"("recordNumber");

-- 3. Update the Bcrs model to match BCR requirements
-- First, create a temporary table with the new schema
CREATE TABLE "BcrsNew" (
  "id" UUID NOT NULL PRIMARY KEY,
  "recordNumber" SERIAL NOT NULL,
  "bcrCode" TEXT NOT NULL UNIQUE,
  "submissionId" UUID NOT NULL,
  "currentPhase" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "urgencyLevel" TEXT NOT NULL,
  "impactedAreas" TEXT[] NOT NULL,
  "workflowHistory" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL
);

-- Copy data from old table to new table (mapping existing fields)
INSERT INTO "BcrsNew" (
  "id", 
  "bcrCode", 
  "submissionId", 
  "currentPhase", 
  "status", 
  "urgencyLevel", 
  "impactedAreas", 
  "workflowHistory", 
  "createdAt", 
  "updatedAt"
)
SELECT 
  "id", 
  COALESCE("bcrNumber", CONCAT('BCR-', TO_CHAR(NOW(), 'YY/YY'), '-', LPAD(CAST(ROW_NUMBER() OVER () AS TEXT), 3, '0'))), 
  "id" AS "submissionId", -- Using the same ID as submission ID temporarily
  'Submit Form' AS "currentPhase", 
  "status", 
  COALESCE("priority", 'Medium') AS "urgencyLevel", 
  '{}' AS "impactedAreas", 
  '[]'::JSONB AS "workflowHistory", 
  "createdAt", 
  "updatedAt"
FROM "Bcrs";

-- Create a foreign key relationship between Bcrs and Submission
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "bcrId" UUID;
UPDATE "Submission" SET "bcrId" = "BcrsNew"."id" FROM "BcrsNew" WHERE "Submission"."id" = "BcrsNew"."submissionId";
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bcrId_fkey" 
  FOREIGN KEY ("bcrId") REFERENCES "BcrsNew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create a foreign key relationship between BcrsNew and Submission
ALTER TABLE "BcrsNew" ADD CONSTRAINT "BcrsNew_submissionId_fkey" 
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "BcrsNew_submissionId_idx" ON "BcrsNew"("submissionId");
CREATE INDEX "BcrsNew_recordNumber_idx" ON "BcrsNew"("recordNumber");
CREATE INDEX "BcrsNew_status_idx" ON "BcrsNew"("status");

-- Rename the BcrsNew table to Bcr (to match the model name in requirements)
ALTER TABLE "BcrsNew" RENAME TO "Bcr";

-- Update BcrWorkflowActivity to reference the new Bcr table
ALTER TABLE "BcrWorkflowActivity" DROP CONSTRAINT IF EXISTS "BcrWorkflowActivity_bcrId_fkey";
ALTER TABLE "BcrWorkflowActivity" ADD CONSTRAINT "BcrWorkflowActivity_bcrId_fkey" 
  FOREIGN KEY ("bcrId") REFERENCES "Bcr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
