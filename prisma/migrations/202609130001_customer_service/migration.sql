-- CreateEnum
CREATE TYPE "CustomerServiceConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CustomerServiceSenderType" AS ENUM ('VISITOR', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "CustomerServiceConversation" (
    "id" TEXT NOT NULL,
    "visitorTokenHash" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "status" "CustomerServiceConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerServiceConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerServiceMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "CustomerServiceSenderType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "CustomerServiceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerServiceConversation_visitorTokenHash_key" ON "CustomerServiceConversation"("visitorTokenHash");
CREATE INDEX "CustomerServiceConversation_status_lastMessageAt_idx" ON "CustomerServiceConversation"("status", "lastMessageAt");
CREATE INDEX "CustomerServiceMessage_conversationId_createdAt_idx" ON "CustomerServiceMessage"("conversationId", "createdAt");
CREATE INDEX "CustomerServiceMessage_conversationId_senderType_readAt_idx" ON "CustomerServiceMessage"("conversationId", "senderType", "readAt");

-- AddForeignKey
ALTER TABLE "CustomerServiceMessage" ADD CONSTRAINT "CustomerServiceMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CustomerServiceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
