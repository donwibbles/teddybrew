import Link from "next/link";

export const metadata = {
  title: "Disclosures - Hive Community",
  description: "Disclosures for Hive Community",
};

export default function DisclosuresPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-neutral-600 hover:text-primary-600 mb-8"
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

        <h1 className="text-3xl font-bold text-neutral-900 mb-4">
          Disclosures
        </h1>

        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          <div className="prose prose-neutral max-w-none">
            <p className="text-neutral-600 text-lg">
              Our disclosures page is being prepared and will be available soon.
            </p>
            <p className="text-neutral-500 mt-4">
              This page will contain important legal disclosures, including information
              about our business practices and any required regulatory notices.
            </p>
          </div>
        </div>

        <p className="text-sm text-neutral-500 mt-8 text-center">
          Questions? Contact us at legal@hivecommunity.com
        </p>
      </div>
    </div>
  );
}
