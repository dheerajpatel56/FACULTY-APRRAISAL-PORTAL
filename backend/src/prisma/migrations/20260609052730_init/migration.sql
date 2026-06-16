-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('FACULTY', 'HOD', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FPGPStatus" AS ENUM ('DRAFT', 'ACTIVE', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('MINI', 'MAJOR');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BTECH', 'MTECH');

-- CreateEnum
CREATE TYPE "PublicationIndex" AS ENUM ('SCI', 'WOS', 'SCOPUS', 'NONE');

-- CreateEnum
CREATE TYPE "PatentStatus" AS ENUM ('FILED', 'PUBLISHED', 'GRANTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('APPLIED', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('HOD', 'REVIEWER');

-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "dateOfJoining" TIMESTAMP(3),
    "designation" TEXT,
    "ratifiedDesignation" TEXT,
    "lastPromotionDate" TIMESTAMP(3),
    "departmentId" TEXT,
    "payBand" TEXT,
    "gradePay" TEXT,
    "grossPay" DOUBLE PRECISION,
    "educationalQuals" TEXT,
    "specialization" TEXT,
    "periodOfServiceYears" INTEGER,
    "periodOfServiceMonths" INTEGER,
    "expBeforeTeaching" DOUBLE PRECISION,
    "expBeforeIndustrial" DOUBLE PRECISION,
    "expBeforeResearch" DOUBLE PRECISION,
    "phone" TEXT,
    "contactAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "departmentId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "submissionOpen" BOOLEAN NOT NULL DEFAULT false,
    "maxSubmissions" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYearDept" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "submissionOpen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYearDept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "submissionNumber" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clLeaves" INTEGER,
    "elLeaves" INTEGER,
    "hplLeaves" INTEGER,
    "odLeaves" INTEGER,
    "otherLeaves" TEXT,
    "higherQualAcquired" TEXT,

    CONSTRAINT "AppraisalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat1Course" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "yearSem" TEXT NOT NULL,
    "novelPedagogyUsed" BOOLEAN NOT NULL DEFAULT false,
    "periodPlanned" INTEGER NOT NULL,
    "periodsConducted" INTEGER NOT NULL,
    "avgAttendance" DOUBLE PRECISION NOT NULL,
    "feedbackScore" DOUBLE PRECISION NOT NULL,
    "passPercentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Cat1Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat1Project" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "course" "CourseLevel" NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "Cat1Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat1EContent" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "contentName" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "evidenceFile" TEXT,

    CONSTRAINT "Cat1EContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat1ICT" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "natureOfUse" TEXT NOT NULL,
    "evidenceFile" TEXT,

    CONSTRAINT "Cat1ICT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Journal" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "journalName" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "authorPosition" TEXT NOT NULL,
    "volume" TEXT,
    "issueNo" TEXT,
    "pageNos" TEXT,
    "dateOfPub" TIMESTAMP(3),
    "issn" TEXT,
    "doi" TEXT,
    "impactFactor" DOUBLE PRECISION,
    "indexed" "PublicationIndex" NOT NULL DEFAULT 'NONE',
    "quartile" TEXT,

    CONSTRAINT "Cat2Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Conference" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "conferenceName" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "authorPosition" TEXT NOT NULL,
    "dateOfPub" TIMESTAMP(3),
    "issn" TEXT,
    "doi" TEXT,
    "indexed" "PublicationIndex" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "Cat2Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2BookChapter" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "authorPosition" TEXT NOT NULL,
    "publisher" TEXT,
    "isbn" TEXT,
    "chapterNo" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "scope" "Scope" NOT NULL DEFAULT 'INTERNATIONAL',

    CONSTRAINT "Cat2BookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Book" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "publisher" TEXT,
    "isbn" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "scope" "Scope" NOT NULL DEFAULT 'INTERNATIONAL',

    CONSTRAINT "Cat2Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Citations" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "scopusCount" INTEGER NOT NULL DEFAULT 0,
    "wosCount" INTEGER NOT NULL DEFAULT 0,
    "hIndex" INTEGER NOT NULL DEFAULT 0,
    "pubsWithCitations" INTEGER NOT NULL DEFAULT 0,
    "totalPubsTillDate" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Cat2Citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Patent" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "inventors" TEXT NOT NULL,
    "appNumber" TEXT,
    "status" "PatentStatus" NOT NULL,
    "dateOfPub" TIMESTAMP(3),
    "dateOfGrant" TIMESTAMP(3),
    "validDuration" TEXT,

    CONSTRAINT "Cat2Patent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Project" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fundingAgency" TEXT NOT NULL,
    "amountLakhs" DOUBLE PRECISION NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "durationPeriod" TEXT,
    "dateOfApplication" TIMESTAMP(3),

    CONSTRAINT "Cat2Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Consultancy" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "amountLakhs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Cat2Consultancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Guidance" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "thesisTitle" TEXT NOT NULL,
    "isGuide" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cat2Guidance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2ResearchGroup" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "Cat2ResearchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Linkage" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "Cat2Linkage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat2Startup" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "Cat2Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3AdvQual" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "pursuingPostDoc" BOOLEAN NOT NULL DEFAULT false,
    "phdStatus" TEXT,
    "pursuingPGDegree" BOOLEAN NOT NULL DEFAULT false,
    "pursuingPGDiploma" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Cat3AdvQual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3OrganisedProgram" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "sponsor" TEXT,
    "status" TEXT NOT NULL,
    "scope" "Scope" NOT NULL,

    CONSTRAINT "Cat3OrganisedProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3ResourcePerson" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "programType" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "organisedBy" TEXT NOT NULL,

    CONSTRAINT "Cat3ResourcePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3Editorial" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "natureOfContrib" TEXT NOT NULL,
    "orgOrJournal" TEXT NOT NULL,
    "scope" "Scope" NOT NULL,
    "dateDuration" TEXT NOT NULL,

    CONSTRAINT "Cat3Editorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3Training" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,

    CONSTRAINT "Cat3Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat3IntlTravel" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "placeOrUniv" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "Cat3IntlTravel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat4AdminResp" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "workInvolved" TEXT NOT NULL,
    "period" TEXT NOT NULL,

    CONSTRAINT "Cat4AdminResp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat4StudentActivity" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "period" TEXT NOT NULL,

    CONSTRAINT "Cat4StudentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat5Membership" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "association" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Cat5Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat5Award" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "awardType" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "Cat5Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat5Differentiator" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Cat5Differentiator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat5Internship" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "industryOrInst" TEXT NOT NULL,
    "studentBatch" TEXT NOT NULL,
    "internshipDetails" TEXT NOT NULL,
    "period" TEXT NOT NULL,

    CONSTRAINT "Cat5Internship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "cat1Score" DOUBLE PRECISION,
    "cat2Score" DOUBLE PRECISION,
    "cat3Score" DOUBLE PRECISION,
    "cat4Score" DOUBLE PRECISION,
    "cat5Score" DOUBLE PRECISION,
    "cat6Punctuality" DOUBLE PRECISION,
    "cat6Professionalism" DOUBLE PRECISION,
    "cat6Willingness" DOUBLE PRECISION,
    "cat6Cordiality" DOUBLE PRECISION,
    "cat6Classroom" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION,
    "teachingComment" TEXT,
    "researchComment" TEXT,
    "developmentComment" TEXT,
    "governanceComment" TEXT,
    "supplementaryComment" TEXT,
    "overallComment" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppraisalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPGPPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" "FPGPStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FPGPPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPGPTarget" (
    "id" TEXT NOT NULL,
    "fpgpId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subSection" TEXT NOT NULL,
    "targetDescription" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "FPGPTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPGPProgress" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "achievementPct" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FPGPProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FPGPReview" (
    "id" TEXT NOT NULL,
    "fpgpId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "comments" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FPGPReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_departmentId_key" ON "UserRole"("userId", "role", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_label_key" ON "AcademicYear"("label");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYearDept_academicYearId_departmentId_key" ON "AcademicYearDept"("academicYearId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalSubmission_userId_academicYearId_submissionNumber_key" ON "AppraisalSubmission"("userId", "academicYearId", "submissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Cat2Citations_submissionId_key" ON "Cat2Citations"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Cat3AdvQual_submissionId_key" ON "Cat3AdvQual"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReview_submissionId_key" ON "AppraisalReview"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "FPGPPlan_userId_academicYearId_key" ON "FPGPPlan"("userId", "academicYearId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYearDept" ADD CONSTRAINT "AcademicYearDept_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYearDept" ADD CONSTRAINT "AcademicYearDept_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalSubmission" ADD CONSTRAINT "AppraisalSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalSubmission" ADD CONSTRAINT "AppraisalSubmission_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat1Course" ADD CONSTRAINT "Cat1Course_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat1Project" ADD CONSTRAINT "Cat1Project_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat1EContent" ADD CONSTRAINT "Cat1EContent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat1ICT" ADD CONSTRAINT "Cat1ICT_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Journal" ADD CONSTRAINT "Cat2Journal_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Conference" ADD CONSTRAINT "Cat2Conference_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2BookChapter" ADD CONSTRAINT "Cat2BookChapter_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Book" ADD CONSTRAINT "Cat2Book_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Citations" ADD CONSTRAINT "Cat2Citations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Patent" ADD CONSTRAINT "Cat2Patent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Project" ADD CONSTRAINT "Cat2Project_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Consultancy" ADD CONSTRAINT "Cat2Consultancy_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Guidance" ADD CONSTRAINT "Cat2Guidance_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2ResearchGroup" ADD CONSTRAINT "Cat2ResearchGroup_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Linkage" ADD CONSTRAINT "Cat2Linkage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat2Startup" ADD CONSTRAINT "Cat2Startup_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3AdvQual" ADD CONSTRAINT "Cat3AdvQual_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3OrganisedProgram" ADD CONSTRAINT "Cat3OrganisedProgram_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3ResourcePerson" ADD CONSTRAINT "Cat3ResourcePerson_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3Editorial" ADD CONSTRAINT "Cat3Editorial_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3Training" ADD CONSTRAINT "Cat3Training_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat3IntlTravel" ADD CONSTRAINT "Cat3IntlTravel_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat4AdminResp" ADD CONSTRAINT "Cat4AdminResp_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat4StudentActivity" ADD CONSTRAINT "Cat4StudentActivity_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat5Membership" ADD CONSTRAINT "Cat5Membership_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat5Award" ADD CONSTRAINT "Cat5Award_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat5Differentiator" ADD CONSTRAINT "Cat5Differentiator_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat5Internship" ADD CONSTRAINT "Cat5Internship_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPPlan" ADD CONSTRAINT "FPGPPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPTarget" ADD CONSTRAINT "FPGPTarget_fpgpId_fkey" FOREIGN KEY ("fpgpId") REFERENCES "FPGPPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPProgress" ADD CONSTRAINT "FPGPProgress_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FPGPTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPProgress" ADD CONSTRAINT "FPGPProgress_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AppraisalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPReview" ADD CONSTRAINT "FPGPReview_fpgpId_fkey" FOREIGN KEY ("fpgpId") REFERENCES "FPGPPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FPGPReview" ADD CONSTRAINT "FPGPReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
