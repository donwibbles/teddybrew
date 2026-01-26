import { S3Client } from "@aws-sdk/client-s3";

/**
 * Backblaze B2 client setup using S3-compatible API
 */

// Singleton pattern for S3 client
const globalForB2 = globalThis as unknown as {
  b2Client: S3Client | undefined;
};

export function getB2Client(): S3Client {
  if (globalForB2.b2Client) {
    return globalForB2.b2Client;
  }

  const endpoint = process.env.B2_ENDPOINT;
  const accessKeyId = process.env.B2_ACCOUNT_ID;
  const secretAccessKey = process.env.B2_APPLICATION_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "B2 credentials not configured. Set B2_ENDPOINT, B2_ACCOUNT_ID, and B2_APPLICATION_KEY environment variables."
    );
  }

  globalForB2.b2Client = new S3Client({
    endpoint,
    region: "us-west-004", // B2 region doesn't matter but SDK requires it
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return globalForB2.b2Client;
}

/**
 * Get the B2 bucket name
 */
export function getB2BucketName(): string {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("B2_BUCKET_NAME environment variable is not set");
  }
  return bucketName;
}

/**
 * Get the public URL base for B2
 */
export function getB2PublicUrl(): string {
  const publicUrl = process.env.B2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error("B2_PUBLIC_URL environment variable is not set");
  }
  return publicUrl;
}

/**
 * Check if B2 is configured
 */
export function isB2Configured(): boolean {
  return !!(
    process.env.B2_ENDPOINT &&
    process.env.B2_ACCOUNT_ID &&
    process.env.B2_APPLICATION_KEY &&
    process.env.B2_BUCKET_NAME &&
    process.env.B2_PUBLIC_URL
  );
}
