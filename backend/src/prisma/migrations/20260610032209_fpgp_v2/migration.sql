/*
  Warnings:

  - You are about to drop the `FPGPProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FPGPTarget` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FPGPProgress" DROP CONSTRAINT "FPGPProgress_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "FPGPProgress" DROP CONSTRAINT "FPGPProgress_targetId_fkey";

-- DropForeignKey
ALTER TABLE "FPGPTarget" DROP CONSTRAINT "FPGPTarget_fpgpId_fkey";

-- AlterTable
ALTER TABLE "FPGPPlan" ADD COLUMN     "dateOfJoiningSnap" TIMESTAMP(3),
ADD COLUMN     "departmentSnap" TEXT,
ADD COLUMN     "designationSnap" TEXT,
ADD COLUMN     "facultySignedAt" TIMESTAMP(3),
ADD COLUMN     "hodSignedAt" TIMESTAMP(3),
ADD COLUMN     "hodSignedBy" TEXT,
ADD COLUMN     "totalExperienceSnap" DOUBLE PRECISION;

-- DropTable
DROP TABLE "FPGPProgress";

-- DropTable
DROP TABLE "FPGPTarget";

-- CreateTable
CREATE TABLE "FPGPSubsection" (
    "id" TEXT NOT NULL,
    "fpgpId" TEXT NOT NULL,
    "subsection" TEXT NOT NULL,
    "sem1Text" TEXT,
    "sem2Text" TEXT,
    "extraText1" TEXT,
    "extraText2" TEXT,
    "extraText3" TEXT,
    "rows" JSONB,

    CONSTRAINT "FPGPSubsection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FPGPSubsection_fpgpId_subsection_key" ON "FPGPSubsection"("fpgpId", "subsection");

-- AddForeignKey
ALTER TABLE "FPGPPlan" ADD CONSTRAINT "FPGPPlan_hodSignedBy_fkey" FOREIGN KEY ("hodSignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPSubsection" ADD CONSTRAINT "FPGPSubsection_fpgpId_fkey" FOREIGN KEY ("fpgpId") REFERENCES "FPGPPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
