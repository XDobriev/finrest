-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "iikoApiKey" TEXT,
ADD COLUMN     "iikoAutoSync" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iikoLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "iikoOrgId" TEXT;
