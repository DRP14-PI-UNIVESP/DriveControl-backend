/*
  Warnings:

  - You are about to drop the column `category` on the `vehicles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[renavam]` on the table `vehicles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `brand` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `color` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `manufacture_year` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `vehicles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `renavam` to the `vehicles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "category",
ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "manufacture_year" INTEGER NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "renavam" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_renavam_key" ON "vehicles"("renavam");
