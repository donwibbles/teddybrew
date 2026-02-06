import Link from "next/link";

export const metadata = {
  title: "Authentication Error - Hive Community",
  description: "An error occurred during authentication",
};

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const { title, description } = getErrorDetails(params.error);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
      {/* Error icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-error-50 rounded-full">
          <svg
            className="w-8 h-8 text-error-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>

      <p className="text-foreground-muted mb-6">{description}</p>

      <div className="flex flex-col gap-3">
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-subtle0 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     transition-colors"
        >
          Try again
        </Link>

        <Link
          href="/"
          className="inline-flex items-center justify-center text-sm text-foreground-muted hover:text-primary-600"
        >
          Go to home page
        </Link>
      </div>
    </div>
  );
}

function getErrorDetails(error?: string): { title: string; description: string } {
  switch (error) {
    case "Configuration":
      return {
        title: "Server Error",
        description:
          "There is a problem with the server configuration. Please try again later.",
      };
    case "AccessDenied":
      return {
        title: "Access Denied",
        description:
          "You do not have permission to sign in. Please contact support if you believe this is an error.",
      };
    case "Verification":
      return {
        title: "Link Expired",
        description:
          "This sign-in link has expired or has already been used. Please request a new one.",
      };
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "EmailCreateAccount":
    case "Callback":
      return {
        title: "Sign-in Error",
        description:
          "There was a problem signing you in. Please try again.",
      };
    case "OAuthAccountNotLinked":
      return {
        title: "Account Not Linked",
        description:
          "This email is already associated with a different sign-in method.",
      };
    case "EmailSignin":
      return {
        title: "Email Error",
        description:
          "Unable to send the sign-in email. Please check your email address and try again.",
      };
    case "SessionRequired":
      return {
        title: "Session Required",
        description: "You need to be signed in to access this page.",
      };
    default:
      return {
        title: "Something Went Wrong",
        description:
          "An unexpected error occurred. Please try again.",
      };
  }
}
