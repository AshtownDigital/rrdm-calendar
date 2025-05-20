-- Add reviewComments field to Submission table
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "reviewComments" TEXT;
