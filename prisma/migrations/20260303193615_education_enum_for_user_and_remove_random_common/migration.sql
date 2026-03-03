/*
  Warnings:

  - The `preferredEducation` column on the `PartnerPreference` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `education` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD');

-- AlterTable
ALTER TABLE "PartnerPreference" DROP COLUMN "preferredEducation",
ADD COLUMN     "preferredEducation" "EducationLevel",
ALTER COLUMN "preferredMaritalStatus" SET DEFAULT ARRAY[]::"MaritalStatus"[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "education",
ADD COLUMN     "education" "EducationLevel";

-- DropEnum
DROP TYPE "EducationPreference";
