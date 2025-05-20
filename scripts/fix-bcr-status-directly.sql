-- Fix BCR status column to accept 'new_submission' value
-- This script directly alters the column type to TEXT to avoid enum issues

-- Step 1: Check if the column is currently an enum type
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'Bcrs' AND column_name = 'status';
    
    IF column_type = 'USER-DEFINED' THEN
        -- Step 2: Convert the column to TEXT type
        ALTER TABLE "Bcrs" ALTER COLUMN "status" TYPE TEXT;
        
        -- Step 3: Set the default value to 'new_submission'
        ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission';
        
        -- Step 4: Update any existing 'draft' values to 'new_submission'
        UPDATE "Bcrs" SET "status" = 'new_submission', "updatedAt" = NOW() WHERE "status" = 'draft';
        
        RAISE NOTICE 'Successfully converted status column to TEXT type with default value new_submission';
    ELSE
        RAISE NOTICE 'Column is already of type %', column_type;
    END IF;
END $$;
