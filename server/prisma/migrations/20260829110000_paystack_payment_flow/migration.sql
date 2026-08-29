-- Additive Paystack payment-attempt fields. Existing commerce rows are preserved.
ALTER TABLE "Payment" ADD COLUMN "authorizationUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "providerTransactionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paidAt" DATETIME;

CREATE UNIQUE INDEX "Payment_providerTransactionId_key" ON "Payment"("providerTransactionId");
