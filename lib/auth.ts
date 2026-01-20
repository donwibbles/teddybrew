import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { getMagicLinkEmailHtml, getMagicLinkEmailText } from "@/lib/email/templates";

// Session type for TypeScript
export interface Session {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

// Auth.js v5 configuration
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      // Custom email sending with branded templates
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { host } = new URL(url);

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            from: provider.from,
            to: email,
            subject: "Sign in to Hive Community",
            html: getMagicLinkEmailHtml({ url, host }),
            text: getMagicLinkEmailText({ url, host }),
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("Failed to send verification email:", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      // Allow all email sign-ins
      if (user.email) {
        return true;
      }
      return false;
    },
  },
  // Magic link expires after 24 hours
  // This is configured in the verification token creation
  debug: process.env.NODE_ENV === "development",
});
