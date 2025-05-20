-- CreateEnum
CREATE TYPE "enum_Bcrs_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "enum_Bcrs_status" AS ENUM ('new', 'new_submission', 'being_prioritised', 'under_technical_review', 'in_governance_review', 'consulting_stakeholders', 'drafting_in_progress', 'awaiting_final_approval', 'being_implemented', 'testing_in_progress', 'preparing_for_go_live', 'under_post_implementation_review', 'closing', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented');

-- CreateEnum
CREATE TYPE "enum_ReleaseNotes_environment" AS ENUM ('development', 'test', 'staging', 'production');

-- CreateEnum
CREATE TYPE "enum_ReleaseNotes_status" AS ENUM ('planned', 'in_progress', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "enum_Users_role" AS ENUM ('admin', 'business');

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "bcrId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "submissionDate" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BcrWorkflowActivity" (
    "id" UUID NOT NULL,
    "bcrId" UUID NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" UUID NOT NULL,
    "performedAt" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BcrWorkflowActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bcrs" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new_submission',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "impact" TEXT,
    "requestedBy" UUID NOT NULL,
    "assignedTo" UUID,
    "targetDate" TIMESTAMPTZ(6),
    "implementationDate" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "bcrNumber" TEXT,

    CONSTRAINT "Bcrs_new_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundings" (
    "id" UUID NOT NULL,
    "trainingRoute" VARCHAR(255) NOT NULL,
    "academicYear" VARCHAR(255) NOT NULL,
    "fundingAmount" DECIMAL(10,2) NOT NULL,
    "fundingType" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMPTZ(6) NOT NULL,
    "expiryDate" TIMESTAMPTZ(6),
    "createdBy" UUID NOT NULL,
    "lastUpdatedBy" UUID,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Fundings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceData" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMPTZ(6),
    "validTo" TIMESTAMPTZ(6),
    "createdBy" UUID NOT NULL,
    "lastUpdatedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReferenceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseNotes" (
    "id" UUID NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "environment" "enum_ReleaseNotes_environment" NOT NULL,
    "status" "enum_ReleaseNotes_status" NOT NULL DEFAULT 'planned',
    "releaseDate" TIMESTAMPTZ(6) NOT NULL,
    "completedDate" TIMESTAMPTZ(6),
    "createdBy" UUID NOT NULL,
    "approvedBy" UUID,
    "changeLog" TEXT,
    "impactedSystems" VARCHAR(255)[],
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReleaseNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequelizeMeta" (
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "BcrConfigs" (
    "id" UUID NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "value" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BcrConfigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "enum_Users_role" NOT NULL DEFAULT 'business',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_submissionNumber_key" ON "Submission"("submissionNumber");

-- CreateIndex
CREATE INDEX "Submission_bcrId_idx" ON "Submission"("bcrId");

-- CreateIndex
CREATE INDEX "Submission_submittedById_idx" ON "Submission"("submittedById");

-- CreateIndex
CREATE INDEX "BcrWorkflowActivity_bcrId_idx" ON "BcrWorkflowActivity"("bcrId");

-- CreateIndex
CREATE INDEX "BcrWorkflowActivity_performedById_idx" ON "BcrWorkflowActivity"("performedById");

-- CreateIndex
CREATE UNIQUE INDEX "Bcrs_new_bcrNumber_key" ON "Bcrs"("bcrNumber");

-- CreateIndex
CREATE INDEX "bcrs_new_assigned_to" ON "Bcrs"("assignedTo");

-- CreateIndex
CREATE INDEX "bcrs_new_requested_by" ON "Bcrs"("requestedBy");

-- CreateIndex
CREATE INDEX "bcrs_new_status" ON "Bcrs"("status");

-- CreateIndex
CREATE INDEX "fundings_training_route_academic_year" ON "Fundings"("trainingRoute", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceData_code_key" ON "ReferenceData"("code");

-- CreateIndex
CREATE INDEX "reference_data_category" ON "ReferenceData"("category");

-- CreateIndex
CREATE INDEX "reference_data_code" ON "ReferenceData"("code");

-- CreateIndex
CREATE INDEX "release_notes_environment_status" ON "ReleaseNotes"("environment", "status");

-- CreateIndex
CREATE INDEX "bcr_configs_type" ON "BcrConfigs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "users_email" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bcrId_fkey" FOREIGN KEY ("bcrId") REFERENCES "Bcrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcrWorkflowActivity" ADD CONSTRAINT "BcrWorkflowActivity_bcrId_fkey" FOREIGN KEY ("bcrId") REFERENCES "Bcrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcrWorkflowActivity" ADD CONSTRAINT "BcrWorkflowActivity_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bcrs" ADD CONSTRAINT "Bcrs_new_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Bcrs" ADD CONSTRAINT "Bcrs_new_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Fundings" ADD CONSTRAINT "Fundings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundings" ADD CONSTRAINT "Fundings_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceData" ADD CONSTRAINT "ReferenceData_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceData" ADD CONSTRAINT "ReferenceData_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNotes" ADD CONSTRAINT "ReleaseNotes_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNotes" ADD CONSTRAINT "ReleaseNotes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
