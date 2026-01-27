"use server";

import { signIn, signOut } from "@/lib/auth";
import { z } from "zod";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { captureServerError } from "@/lib/sentry";

// Email validation schema
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type SignInState = {
  success?: boolean;
  error?: string;
};

/**
 * Request magic link sign-in
 */
export async function requestMagicLink(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  // Get client IP for rate limiting
  const headersList = await headers();
  const ip =
    headersList.get("fly-client-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "127.0.0.1";

  // Check rate limit
  const { success: withinLimit, remaining } = await checkAuthRateLimit(ip);
  if (!withinLimit) {
    return {
      error: `Too many sign-in attempts. Please try again in 15 minutes. (${remaining} attempts remaining)`,
    };
  }

  // Validate email
  const rawEmail = formData.get("email");
  const result = signInSchema.safeParse({ email: rawEmail });

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message || "Invalid email address",
    };
  }

  const { email } = result.data;

  try {
    await signIn("resend", {
      email,
      redirect: false,
      redirectTo: "/communities",
    });

    return { success: true };
  } catch (error) {
    console.error("Sign-in error:", error);
    captureServerError("auth.requestMagicLink", error);
    return {
      error: "Unable to send magic link. Please try again.",
    };
  }
}

/**
 * Sign out the current user
 */
export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
