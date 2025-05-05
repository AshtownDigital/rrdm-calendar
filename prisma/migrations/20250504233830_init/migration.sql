-- CreateEnum
CREATE TYPE "enum_Bcrs_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "enum_Bcrs_status" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented');

-- CreateEnum
CREATE TYPE "enum_ReleaseNotes_environment" AS ENUM ('development', 'test', 'staging', 'production');

-- CreateEnum
CREATE TYPE "enum_ReleaseNotes_status" AS ENUM ('planned', 'in_progress', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "enum_Users_role" AS ENUM ('admin', 'business');

-- CreateTable
CREATE TABLE "Bcrs" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "enum_Bcrs_status" NOT NULL DEFAULT 'draft',
    "priority" "enum_Bcrs_priority" NOT NULL DEFAULT 'medium',
    "impact" TEXT,
    "requestedBy" UUID NOT NULL,
    "assignedTo" UUID,
    "targetDate" TIMESTAMPTZ(6),
    "implementationDate" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Bcrs_pkey" PRIMARY KEY ("id")
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
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bcrs_assigned_to" ON "Bcrs"("assignedTo");

-- CreateIndex
CREATE INDEX "bcrs_requested_by" ON "Bcrs"("requestedBy");

-- CreateIndex
CREATE INDEX "bcrs_status" ON "Bcrs"("status");

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
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "users_email" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Bcrs" ADD CONSTRAINT "Bcrs_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bcrs" ADD CONSTRAINT "Bcrs_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
