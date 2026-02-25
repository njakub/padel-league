-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_sitOutPlayerId_fkey";

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "sitOutPlayerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "leagueType" TEXT NOT NULL DEFAULT 'SUNDAY';

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sitOutPlayerId_fkey" FOREIGN KEY ("sitOutPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
