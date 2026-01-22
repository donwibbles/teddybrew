import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = {
  title: "Settings - Hive Community",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="text-neutral-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your public profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">Display Name</p>
                <p className="text-neutral-900">{user.name || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">Username</p>
                <p className="text-neutral-900">{user.username ? `@${user.username}` : "Not set"}</p>
              </div>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Email Address</p>
              <p className="text-neutral-900">{user.email}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Used for signing in with magic links
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700">Account Created</p>
              <p className="text-neutral-900">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Section */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Manage your current session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Sign out of your current session. You will need to sign in again with a magic link.
            </p>
            <SignOutButton className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors" />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error-200">
        <CardHeader>
          <CardTitle className="text-error-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-700">Delete Account</p>
              <p className="text-sm text-neutral-500 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              disabled
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-error-600 border border-error-300 rounded-lg opacity-50 cursor-not-allowed"
            >
              Delete Account (Coming Soon)
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
