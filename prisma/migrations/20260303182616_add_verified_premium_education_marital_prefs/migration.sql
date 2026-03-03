-- CreateEnum
CREATE TYPE "EducationPreference" AS ENUM ('RANDOM', 'COMMON', 'HIGH_SCHOOL', 'BACHELOR', 'MASTER', 'PHD');

-- AlterTable
ALTER TABLE "PartnerPreference" ADD COLUMN     "preferredEducation" "EducationPreference",
ADD COLUMN     "preferredMaritalStatus" "MaritalStatus"[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremiumMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
