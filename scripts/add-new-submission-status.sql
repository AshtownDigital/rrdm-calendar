-- SQL script to add 'new_submission' status to the database
-- and set it as the default status for new BCRs

-- First, check the current column type and values
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'Bcrs' AND column_name = 'status';

-- If the column exists as an enum type, we need to alter it
-- If not, we'll create it as a new enum type

-- Create a function to handle the enum update
CREATE OR REPLACE FUNCTION update_bcr_status_enum() RETURNS void AS $$
DECLARE
    enum_exists boolean;
BEGIN
    -- Check if the enum type exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_bcrs_status'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        -- Enum exists, check if 'new_submission' is already a value
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = 'enum_bcrs_status'::regtype 
            AND enumlabel = 'new_submission'
        ) THEN
            -- Add 'new_submission' to the enum
            ALTER TYPE enum_bcrs_status ADD VALUE 'new_submission';
            RAISE NOTICE 'Added new_submission to enum_bcrs_status';
        ELSE
            RAISE NOTICE 'new_submission already exists in enum_bcrs_status';
        END IF;
    ELSE
        -- Enum doesn't exist, create it with all needed values
        CREATE TYPE enum_bcrs_status AS ENUM (
            'draft',
            'submitted',
            'under_review',
            'approved',
            'rejected',
            'implemented',
            'new_submission'
        );
        RAISE NOTICE 'Created enum_bcrs_status with new_submission value';
        
        -- If the Bcrs table exists, update its status column
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'Bcrs'
        ) THEN
            -- Check if status column exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Bcrs' AND column_name = 'status'
            ) THEN
                -- Alter the column to use the new enum type
                ALTER TABLE "Bcrs" ALTER COLUMN "status" TYPE enum_bcrs_status USING 'draft'::enum_bcrs_status;
                RAISE NOTICE 'Updated Bcrs.status column to use enum_bcrs_status';
            END IF;
        END IF;
    END IF;
    
    -- Set the default status for new BCRs to 'new_submission'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Bcrs' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Bcrs" ALTER COLUMN "status" SET DEFAULT 'new_submission'::enum_bcrs_status;
        RAISE NOTICE 'Set default status for Bcrs.status to new_submission';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_bcr_status_enum();

-- Drop the function when done
DROP FUNCTION update_bcr_status_enum();

-- Delete all existing BCRs
DELETE FROM "Bcrs";

-- Display the current status column information
SELECT column_name, data_type, column_default, udt_name
FROM information_schema.columns
WHERE table_name = 'Bcrs' AND column_name = 'status';
