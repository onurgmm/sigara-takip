-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "quitDate" DATETIME NOT NULL,
    "dailyCigarettes" INTEGER NOT NULL,
    "packPrice" REAL NOT NULL,
    "cigarettesPerPack" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
