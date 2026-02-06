import Link from "next/link";

export default function CommunityNotFound() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-background-muted rounded-full mb-6">
        <svg
          className="w-8 h-8 text-foreground-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Community Not Found
      </h1>
      <p className="text-foreground-muted mb-6">
        The community you&apos;re looking for doesn&apos;t exist or has been
        deleted.
      </p>
      <Link
        href="/communities"
        className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
      >
        Browse Communities
      </Link>
    </div>
  );
}
