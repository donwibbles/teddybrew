import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-semibold text-xl text-primary-600">
            Hive Community
          </Link>

          {/* Navigation */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/explore"
              className="text-sm text-foreground-muted hover:text-primary-600 transition-colors"
            >
              Explore Communities
            </Link>
            <Link
              href="/explore/feed"
              className="text-sm text-foreground-muted hover:text-primary-600 transition-colors"
            >
              Feed
            </Link>
            <Link
              href="/explore/events"
              className="text-sm text-foreground-muted hover:text-primary-600 transition-colors"
            >
              Events
            </Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-foreground-muted hover:text-primary-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-subtle0 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
