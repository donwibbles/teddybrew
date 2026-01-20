import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";
import { DevLoginForm } from "./dev-login-form";

export const metadata = {
  title: "Sign In - Hive Community",
  description: "Sign in to Hive Community with your email",
};

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  // Check if already authenticated
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl || "/communities");
  }

  const errorMessage = params.error
    ? getErrorMessage(params.error)
    : undefined;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-zinc-200 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome to Hive Community
        </h1>
        <p className="text-zinc-600 mt-2">
          Sign in with your email to continue
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {errorMessage}
        </div>
      )}

      <SignInForm callbackUrl={params.callbackUrl} />

      {/* Dev-only login bypass */}
      {process.env.NODE_ENV === "development" && (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-xs text-zinc-400 uppercase tracking-wide">
              Dev Only
            </span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>
          <DevLoginForm />
        </>
      )}
    </div>
  );
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "Configuration":
      return "There is a problem with the server configuration.";
    case "AccessDenied":
      return "Access denied. You may not have permission to sign in.";
    case "Verification":
      return "The sign-in link has expired or has already been used.";
    case "Default":
    default:
      return "An error occurred during sign in. Please try again.";
  }
}
