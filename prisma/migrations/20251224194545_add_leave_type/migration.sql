-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Leave" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leaveType" TEXT NOT NULL DEFAULT 'UNPAID',
    CONSTRAINT "Leave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Leave" ("endDate", "id", "reason", "startDate", "status", "userId") SELECT "endDate", "id", "reason", "startDate", "status", "userId" FROM "Leave";
DROP TABLE "Leave";
ALTER TABLE "new_Leave" RENAME TO "Leave";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
