-- Script to remove 'draft' status from enum_Bcrs_status and ensure only 'new_submission' is used

-- First, delete all existing BCRs to avoid conflicts
DELETE FROM "Bcrs";

-- Now, let's recreate the enum_Bcrs_status type without 'draft'
DO $$
DECLARE
    enum_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_bcrs_status'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        -- Drop the existing enum type (since we've deleted all BCRs, this is safe)
        EXECUTE 'DROP TYPE enum_Bcrs_status CASCADE';
        RAISE NOTICE 'Dropped existing enum_Bcrs_status type';
    END IF;
    
    -- Create a new enum type without 'draft' status
    CREATE TYPE enum_Bcrs_status AS ENUM (
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
        'new',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'implemented'
    );
    RAISE NOTICE 'Created new enum_Bcrs_status type without draft status';
    
    -- Update the Bcrs table to use the new enum type with new_submission as default
    ALTER TABLE "Bcrs" ALTER COLUMN status TYPE enum_Bcrs_status USING 'new_submission'::enum_Bcrs_status;
    ALTER TABLE "Bcrs" ALTER COLUMN status SET DEFAULT 'new_submission'::enum_Bcrs_status;
    RAISE NOTICE 'Updated Bcrs.status column to use enum_Bcrs_status with new_submission as default';
END $$;

-- Verify the changes
SELECT column_name, data_type, column_default, udt_name
FROM information_schema.columns
WHERE table_name = 'Bcrs' AND column_name = 'status';

-- List all values in the enum
SELECT n.nspname as enum_schema,
       t.typname as enum_name,
       e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'enum_bcrs_status'
ORDER BY enum_schema, enum_name, e.enumsortorder;
