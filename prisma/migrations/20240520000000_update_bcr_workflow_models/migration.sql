-- Update BcrWorkflowActivity model
ALTER TABLE "BcrWorkflowActivity" 
DROP COLUMN "phase",
DROP COLUMN "status",
DROP COLUMN "action",
ADD COLUMN "fromPhaseId" TEXT NOT NULL,
ADD COLUMN "toPhaseId" TEXT NOT NULL,
ADD COLUMN "fromStatus" TEXT NOT NULL,
ADD COLUMN "toStatus" TEXT NOT NULL,
ADD COLUMN "userId" TEXT,
ADD COLUMN "comment" TEXT,
ADD COLUMN "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
ALTER COLUMN "performedById" DROP NOT NULL;

-- Update Bcrs model to add currentPhaseId
ALTER TABLE "Bcrs" 
ADD COLUMN "currentPhaseId" TEXT;

-- Create indexes for better performance
CREATE INDEX "bcr_workflow_activity_from_phase_id" ON "BcrWorkflowActivity"("fromPhaseId");
CREATE INDEX "bcr_workflow_activity_to_phase_id" ON "BcrWorkflowActivity"("toPhaseId");
CREATE INDEX "bcr_current_phase_id" ON "Bcrs"("currentPhaseId");
