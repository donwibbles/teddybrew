-- Add threading and pinning fields to Message
ALTER TABLE "Message" ADD COLUMN "clientMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "threadRootId" TEXT;
ALTER TABLE "Message" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "isPinnedInChannel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "isPinnedInThread" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "pinnedById" TEXT;

-- Add unique constraint for clientMessageId
ALTER TABLE "Message" ADD CONSTRAINT "Message_clientMessageId_key" UNIQUE ("clientMessageId");

-- Add foreign key for threadRootId (self-referencing)
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadRootId_fkey"
  FOREIGN KEY ("threadRootId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for pinnedById
ALTER TABLE "Message" ADD CONSTRAINT "Message_pinnedById_fkey"
  FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for Message
CREATE INDEX "Message_channelId_isPinnedInChannel_idx" ON "Message"("channelId", "isPinnedInChannel");
CREATE INDEX "Message_threadRootId_isPinnedInThread_idx" ON "Message"("threadRootId", "isPinnedInThread");
CREATE INDEX "Message_threadRootId_createdAt_idx" ON "Message"("threadRootId", "createdAt");
CREATE INDEX "Message_clientMessageId_idx" ON "Message"("clientMessageId");

-- Create UserChannelRead table for unread tracking
CREATE TABLE "UserChannelRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChannelRead_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint and indexes for UserChannelRead
CREATE UNIQUE INDEX "UserChannelRead_userId_channelId_key" ON "UserChannelRead"("userId", "channelId");
CREATE INDEX "UserChannelRead_userId_idx" ON "UserChannelRead"("userId");
CREATE INDEX "UserChannelRead_channelId_idx" ON "UserChannelRead"("channelId");

-- Add foreign keys for UserChannelRead
ALTER TABLE "UserChannelRead" ADD CONSTRAINT "UserChannelRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserChannelRead" ADD CONSTRAINT "UserChannelRead_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing replies: set threadRootId and depth for level-1 replies
UPDATE "Message" SET "threadRootId" = "replyToId", "depth" = 1
WHERE "replyToId" IS NOT NULL AND "threadRootId" IS NULL;

-- Backfill replyCount on thread roots (messages that have replies)
UPDATE "Message" m SET "replyCount" = (
  SELECT COUNT(*) FROM "Message" r
  WHERE r."threadRootId" = m."id" AND r."deletedAt" IS NULL
) WHERE EXISTS (
  SELECT 1 FROM "Message" r WHERE r."threadRootId" = m."id"
);
