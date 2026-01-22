import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-neutral-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary-600">Hive Community</span>
            <span className="text-neutral-400">|</span>
            <span className="text-sm text-neutral-500">
              Build Communities. Connect People.
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/communities"
              className="text-neutral-600 hover:text-primary-600 transition-colors"
            >
              Communities
            </Link>
            <Link
              href="/events"
              className="text-neutral-600 hover:text-primary-600 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/profile"
              className="text-neutral-600 hover:text-primary-600 transition-colors"
            >
              Profile
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} Hive Community. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
