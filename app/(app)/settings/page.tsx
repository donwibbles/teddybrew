import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ThemeSelector } from "@/components/settings/theme-selector";

export const metadata = {
  title: "Settings - Hive Community",
  description: "Manage your account settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  const { setup } = await searchParams;
  const isSetup = setup === "username";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="text-neutral-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload a photo to personalize your profile</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <AvatarUpload
            userId={user.id}
            currentImage={user.image}
            userName={user.name}
          />
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your profile information and privacy settings</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditForm
            initialFirstName={user.firstName}
            initialLastName={user.lastName}
            initialName={user.name}
            initialUsername={user.username}
            initialBio={user.bio}
            initialInterests={user.interests}
            initialCommunityHope={user.communityHope}
            initialIsPublic={user.isPublic}
            initialShowUpcomingEvents={user.showUpcomingEvents}
            initialShowPastEvents={user.showPastEvents}
            initialShowCommunities={user.showCommunities}
            initialEmailEventReminders={user.emailEventReminders}
            isSetup={isSetup}
            redirectTo="/dashboard"
          />
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
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
