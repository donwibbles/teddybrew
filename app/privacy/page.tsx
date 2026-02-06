import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Hive Community",
  description: "Privacy Policy for Hive Community",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-muted">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-foreground-muted hover:text-primary-600 mb-8"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-4">
          Privacy Policy
        </h1>

        <div className="bg-card rounded-lg border border-border p-8">
          <div className="prose prose-neutral max-w-none">
            <p className="text-foreground-muted text-lg">
              Our Privacy Policy is being prepared and will be available soon.
            </p>
            <p className="text-foreground-muted mt-4">
              We are committed to protecting your privacy and personal data.
              This page will detail how we collect, use, and protect your information.
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground-muted mt-8 text-center">
          Questions? Contact us at privacy@hivecommunity.com
        </p>
      </div>
    </div>
  );
}
