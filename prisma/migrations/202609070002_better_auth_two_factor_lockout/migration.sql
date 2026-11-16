-- Keep the local Better Auth schema aligned with the two-factor plugin.
ALTER TABLE "TwoFactor"
    ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lockedUntil" TIMESTAMP(3);
