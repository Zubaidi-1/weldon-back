/*
  Warnings:

  - Added the required column `is_Verified_review` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "is_Verified_review" BOOLEAN NOT NULL;
