-- CreateTable
CREATE TABLE "WorkflowPhase" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "completedStatus" TEXT NOT NULL,

    CONSTRAINT "WorkflowPhase_pkey" PRIMARY KEY ("id")
);
