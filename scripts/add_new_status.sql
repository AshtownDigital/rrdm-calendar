-- Add 'new' status to enum_Bcrs_status
-- We need to create a new type, update references, and then drop the old type

-- Step 1: Create a new enum type with all values including the new 'new' status
CREATE TYPE "enum_Bcrs_status_new" AS ENUM (
  'new',
  'new_submission',
  'being_prioritised',
  'under_technical_review',
  'in_governance_review',
  'consulting_stakeholders',
  'drafting_in_progress',
  'awaiting_final_approval',
  'being_implemented',
  'testing_in_progress',
  'preparing_for_go_live',
  'under_post_implementation_review',
  'closing',
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'implemented'
);

-- Step 2: Update the column to use the new type
-- First, we need to alter the column to drop the default
ALTER TABLE "Bcrs" ALTER COLUMN "status" DROP DEFAULT;

-- Convert existing values to the new type
-- This creates a temporary column with the new type, copies values, drops old column, and renames
ALTER TABLE "Bcrs" 
  ADD COLUMN "status_new" "enum_Bcrs_status_new";

-- Copy data from old enum to new enum
UPDATE "Bcrs" 
SET "status_new" = "status"::TEXT::"enum_Bcrs_status_new";

-- Drop old column and rename new column
ALTER TABLE "Bcrs" DROP COLUMN "status";
ALTER TABLE "Bcrs" RENAME COLUMN "status_new" TO "status";

-- Set the default back
ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'draft'::"enum_Bcrs_status_new";

-- Step 3: Drop the old enum type
DROP TYPE "enum_Bcrs_status";

-- Step 4: Rename the new enum type to the original name
ALTER TYPE "enum_Bcrs_status_new" RENAME TO "enum_Bcrs_status";

-- Step 5: Create index that might have been dropped
CREATE INDEX "bcrs_status" ON "Bcrs"("status");
