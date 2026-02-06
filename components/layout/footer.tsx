import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-foreground-muted">
        <span>&copy; {currentYear} Hive Community</span>
        <nav className="flex gap-4">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/disclosures"
            className="hover:text-foreground transition-colors"
          >
            Disclosures
          </Link>
        </nav>
      </div>
    </footer>
  );
}
