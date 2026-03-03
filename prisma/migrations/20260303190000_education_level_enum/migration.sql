-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD');

-- AlterTable: User.education from TEXT to EducationLevel (existing free-text cleared; use enum going forward)
ALTER TABLE "User" ADD COLUMN "education_new" "EducationLevel";
ALTER TABLE "User" DROP COLUMN "education";
ALTER TABLE "User" RENAME COLUMN "education_new" TO "education";

-- AlterTable: PartnerPreference.preferredEducation - keep only values that exist in EducationLevel
ALTER TABLE "PartnerPreference" ADD COLUMN "preferredEducation_new" "EducationLevel";
UPDATE "PartnerPreference" SET "preferredEducation_new" = "preferredEducation"::text::"EducationLevel" WHERE "preferredEducation"::text IN ('HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD');
ALTER TABLE "PartnerPreference" DROP COLUMN "preferredEducation";
ALTER TABLE "PartnerPreference" RENAME COLUMN "preferredEducation_new" TO "preferredEducation";

-- DropEnum
DROP TYPE "EducationPreference";
