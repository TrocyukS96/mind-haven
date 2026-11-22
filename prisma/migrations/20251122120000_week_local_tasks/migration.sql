-- CreateTable
CREATE TABLE "WeekLocalTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekColumnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "plannedDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekLocalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekTaskPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "weekColumnId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekTaskPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeekLocalTask_userId_idx" ON "WeekLocalTask"("userId");

-- CreateIndex
CREATE INDEX "WeekLocalTask_weekColumnId_idx" ON "WeekLocalTask"("weekColumnId");

-- CreateIndex
CREATE INDEX "WeekLocalTask_weekColumnId_plannedDate_idx" ON "WeekLocalTask"("weekColumnId", "plannedDate");

-- CreateIndex
CREATE INDEX "WeekTaskPlacement_userId_idx" ON "WeekTaskPlacement"("userId");

-- CreateIndex
CREATE INDEX "WeekTaskPlacement_weekColumnId_idx" ON "WeekTaskPlacement"("weekColumnId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekTaskPlacement_taskId_weekColumnId_key" ON "WeekTaskPlacement"("taskId", "weekColumnId");

-- AddForeignKey
ALTER TABLE "WeekLocalTask" ADD CONSTRAINT "WeekLocalTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekLocalTask" ADD CONSTRAINT "WeekLocalTask_weekColumnId_fkey" FOREIGN KEY ("weekColumnId") REFERENCES "TaskColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTaskPlacement" ADD CONSTRAINT "WeekTaskPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTaskPlacement" ADD CONSTRAINT "WeekTaskPlacement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekTaskPlacement" ADD CONSTRAINT "WeekTaskPlacement_weekColumnId_fkey" FOREIGN KEY ("weekColumnId") REFERENCES "TaskColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
