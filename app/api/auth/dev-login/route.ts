import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { captureServerError } from "@/lib/sentry";
import { env } from "@/lib/env";

/**
 * Dev-only login endpoint that bypasses email verification
 * ONLY works when NODE_ENV === "development"
 */
export async function POST(request: NextRequest) {
  // Hard fail in production - this is critical security
  if (env.NODE_ENV !== "development") {
    console.error(
      "SECURITY ALERT: dev-login endpoint called in non-development environment"
    );
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Find or create the user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
          name: email.split("@")[0], // Use email prefix as name
        },
      });
    }

    // Create a session
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const sessionToken = crypto.randomUUID();

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set("next-auth.session-token", sessionToken, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false, // Allow http in development
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Dev login error:", error);
    captureServerError("api.devLogin", error, { layer: "api-route" });
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
