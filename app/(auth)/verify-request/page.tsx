import Link from "next/link";

export const metadata = {
  title: "Check Your Email - Hive Community",
  description: "Check your email for the magic link to sign in",
};

export default function VerifyRequestPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
      {/* Email icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
        Check your email
      </h1>

      <p className="text-neutral-600 mb-6">
        We&apos;ve sent you a magic link to sign in. Click the link in the email
        to continue.
      </p>

      {/* Link validity note */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-primary-900">Link expires in 24 hours</p>
            <p className="text-sm text-primary-700 mt-1">
              For security, your magic link will expire. If it expires, simply request a new one.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium text-neutral-900 mb-2">
          Didn&apos;t receive the email?
        </h2>
        <ul className="text-sm text-neutral-600 space-y-1.5 text-left">
          <li className="flex items-start gap-2">
            <span className="text-neutral-400">•</span>
            Check your spam or junk folder
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neutral-400">•</span>
            Make sure you entered the correct email
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neutral-400">•</span>
            Wait a few minutes and try again
          </li>
        </ul>
      </div>

      <Link
        href="/sign-in"
        className="inline-flex items-center text-sm text-neutral-600 hover:text-primary-600"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to sign in
      </Link>
    </div>
  );
}
