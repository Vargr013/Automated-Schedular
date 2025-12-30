-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "department_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "required_type" TEXT,
    "is_smod" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AutomationRule_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
