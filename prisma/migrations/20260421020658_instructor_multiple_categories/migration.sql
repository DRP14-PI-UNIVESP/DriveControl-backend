/*
  Warnings:

  - You are about to drop the column `category` on the `instructors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "instructors" DROP COLUMN "category",
ADD COLUMN     "categories" TEXT[];
