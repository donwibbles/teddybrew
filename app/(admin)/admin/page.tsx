import { getAdminStats } from "@/lib/actions/admin";
import { Users, Building2, FileText, Calendar } from "lucide-react";

export const metadata = {
  title: "Admin Dashboard - Hive Community",
};

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const statCards = [
    {
      label: "Total Users",
      value: stats?.userCount ?? 0,
      icon: Users,
      color: "text-primary-600",
      bg: "bg-primary-subtle",
    },
    {
      label: "Communities",
      value: stats?.communityCount ?? 0,
      icon: Building2,
      color: "text-success-600",
      bg: "bg-success-50",
    },
    {
      label: "Posts",
      value: stats?.postCount ?? 0,
      icon: FileText,
      color: "text-warning-600",
      bg: "bg-warning-50",
    },
    {
      label: "Events",
      value: stats?.eventCount ?? 0,
      icon: Calendar,
      color: "text-error-600",
      bg: "bg-error-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-foreground-muted mt-1">
          System overview and statistics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${bg} ${color} p-2 rounded-lg`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {value.toLocaleString()}
                </p>
                <p className="text-sm text-foreground-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
