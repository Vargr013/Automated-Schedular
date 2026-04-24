CREATE TABLE "RosterImportColourMapping" (
    "id" SERIAL NOT NULL,
    "sourceColor" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterImportColourMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RosterImportColourMapping_sourceColor_key" ON "RosterImportColourMapping"("sourceColor");
CREATE INDEX "RosterImportColourMapping_departmentId_idx" ON "RosterImportColourMapping"("departmentId");

ALTER TABLE "RosterImportColourMapping"
ADD CONSTRAINT "RosterImportColourMapping_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
