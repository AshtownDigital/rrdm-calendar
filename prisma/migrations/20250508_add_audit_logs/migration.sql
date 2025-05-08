-- CreateTable
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "details" JSONB,
  "ipAddress" TEXT,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
