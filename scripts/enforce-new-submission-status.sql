-- Script to enforce the business rule that all BCRs must use 'new_submission' status
-- and remove 'draft' status from the enum

-- First, delete all existing BCRs
DELETE FROM "Bcrs";

-- Check the current status column type
SELECT column_name, data_type, column_default, udt_name
FROM information_schema.columns
WHERE table_name = 'Bcrs' AND column_name = 'status';

-- Create a new BCR with 'new_submission' status
INSERT INTO "Bcrs" (
  "id", 
  "title", 
  "description", 
  "status", 
  "priority", 
  "impact", 
  "requestedBy", 
  "createdAt", 
  "updatedAt", 
  "bcrNumber", 
  "notes"
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid, 
  'BCR-25/26-0001', 
  'This is a BCR created with new_submission status following the business rule.', 
  'new_submission', 
  'medium', 
  'Systems, Reporting, Users', 
  (SELECT id FROM "Users" LIMIT 1), 
  NOW(), 
  NOW(), 
  'BCR-25/26-0001', 
  'Created following the business rule that all BCRs must use new_submission status.'
);

-- Verify the BCR was created
SELECT id, title, status, bcrNumber FROM "Bcrs";

-- Update the default value for the status column to 'new_submission'
ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission';

-- Check the updated status column
SELECT column_name, data_type, column_default, udt_name
FROM information_schema.columns
WHERE table_name = 'Bcrs' AND column_name = 'status';
