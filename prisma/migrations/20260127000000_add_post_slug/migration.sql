-- AlterTable: Add slug column as nullable first
ALTER TABLE "Post" ADD COLUMN "slug" VARCHAR(350);

-- Backfill existing posts: generate slug from title with id suffix for uniqueness
UPDATE "Post"
SET "slug" = CONCAT(
  LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM("title")),
          '[^\w\s-]', '', 'g'
        ),
        '[\s_-]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    ),
    300
  ),
  '-',
  LEFT("id", 8)
);

-- Handle any empty slugs (e.g. titles with only special characters)
UPDATE "Post"
SET "slug" = CONCAT('post-', LEFT("id", 8))
WHERE "slug" IS NULL OR "slug" = '' OR "slug" = CONCAT('-', LEFT("id", 8));

-- Set column to NOT NULL
ALTER TABLE "Post" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex: unique constraint on (communityId, slug)
CREATE UNIQUE INDEX "Post_communityId_slug_key" ON "Post"("communityId", "slug");
