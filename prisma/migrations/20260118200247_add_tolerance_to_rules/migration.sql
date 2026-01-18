-- DropForeignKey
ALTER TABLE "Leave" DROP CONSTRAINT "Leave_userId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserBaseRule" DROP CONSTRAINT "UserBaseRule_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserSkill" DROP CONSTRAINT "UserSkill_user_id_fkey";

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "tolerance" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBaseRule" ADD CONSTRAINT "UserBaseRule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
