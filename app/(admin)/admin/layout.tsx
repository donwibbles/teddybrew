import { ReactNode } from "react";
import Link from "next/link";
import { verifyAdmin } from "@/lib/admin";
import { Home, Users, Building2, ArrowLeft, Shield } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/communities", label: "Communities", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Verify admin access
  await verifyAdmin();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <div className="bg-neutral-900 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-warning-400" />
            <span className="font-semibold">Admin Panel</span>
          </div>
          <Link
            href="/communities"
            className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
