-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "quitDate" DATETIME NOT NULL,
    "dailyCigarettes" INTEGER NOT NULL,
    "packPrice" REAL NOT NULL,
    "cigarettesPerPack" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthScore" INTEGER NOT NULL DEFAULT 40
);
INSERT INTO "new_User" ("cigarettesPerPack", "createdAt", "dailyCigarettes", "id", "name", "packPrice", "quitDate") SELECT "cigarettesPerPack", "createdAt", "dailyCigarettes", "id", "name", "packPrice", "quitDate" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
