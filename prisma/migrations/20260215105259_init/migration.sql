-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "totalMatches" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "sitOutPlayerId" INTEGER NOT NULL,
    "teamAPlayer1Id" INTEGER NOT NULL,
    "teamAPlayer2Id" INTEGER NOT NULL,
    "teamBPlayer1Id" INTEGER NOT NULL,
    "teamBPlayer2Id" INTEGER NOT NULL,
    "teamAGames" INTEGER,
    "teamBGames" INTEGER,
    "winnerTeam" TEXT,
    "playedAt" DATETIME,
    CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_sitOutPlayerId_fkey" FOREIGN KEY ("sitOutPlayerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamAPlayer1Id_fkey" FOREIGN KEY ("teamAPlayer1Id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamAPlayer2Id_fkey" FOREIGN KEY ("teamAPlayer2Id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamBPlayer1Id_fkey" FOREIGN KEY ("teamBPlayer1Id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamBPlayer2Id_fkey" FOREIGN KEY ("teamBPlayer2Id") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Match_seasonId_matchNumber_key" ON "Match"("seasonId", "matchNumber");
