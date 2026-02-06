import Link from "next/link";
import { auth } from "@/lib/auth";
import { getInviteByToken } from "@/lib/actions/invite";
import { Users, Clock, AlertTriangle } from "lucide-react";
import { AcceptInviteButton } from "./accept-button";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return { title: "Invite Not Found - Hive Community" };
  }

  return {
    title: `Join ${invite.community.name} - Hive Community`,
    description: `You've been invited to join ${invite.community.name}`,
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await auth();
  const invite = await getInviteByToken(token);

  // Invite not found
  if (!invite) {
    return (
      <div className="min-h-screen bg-background-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="p-4 bg-background-muted rounded-full inline-block mb-4">
            <AlertTriangle className="h-12 w-12 text-foreground-muted" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Invite Not Found
          </h1>
          <p className="text-foreground-muted mb-6">
            This invitation link is invalid or has been cancelled.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-primary-subtle0 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Invite expired
  if (invite.isExpired) {
    return (
      <div className="min-h-screen bg-background-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="p-4 bg-warning-100 rounded-full inline-block mb-4">
            <Clock className="h-12 w-12 text-warning-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Invite Expired
          </h1>
          <p className="text-foreground-muted mb-6">
            This invitation to join <strong>{invite.community.name}</strong> has expired.
            Please ask the community owner to send a new invitation.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-primary-subtle0 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in - prompt to sign in
  if (!session?.user) {
    const callbackUrl = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="min-h-screen bg-background-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <div className="p-4 bg-primary-subtle-hover rounded-full inline-block mb-4">
              <Users className="h-12 w-12 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              You&apos;re Invited!
            </h1>
            <p className="text-foreground-muted mb-2">
              Join <strong>{invite.community.name}</strong> on Hive Community
            </p>
            {invite.community.description && (
              <p className="text-sm text-foreground-muted mb-6 italic">
                &quot;{invite.community.description}&quot;
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted mb-6">
              <Users className="h-4 w-4" />
              <span>{invite.community.memberCount} members</span>
            </div>

            <div className="p-4 bg-background-muted rounded-lg mb-6">
              <p className="text-sm text-foreground-muted">
                Sign in with <strong>{invite.email}</strong> to accept this invitation.
              </p>
            </div>

            <Link
              href={`/sign-in?callbackUrl=${callbackUrl}`}
              className="block w-full px-6 py-3 bg-primary-subtle0 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Sign In to Accept
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - check email match
  const userEmail = session.user.email?.toLowerCase();
  const inviteEmail = invite.email.toLowerCase();

  if (userEmail !== inviteEmail) {
    return (
      <div className="min-h-screen bg-background-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <div className="p-4 bg-warning-100 rounded-full inline-block mb-4">
              <AlertTriangle className="h-12 w-12 text-warning-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Wrong Account
            </h1>
            <p className="text-foreground-muted mb-4">
              This invitation was sent to <strong>{invite.email}</strong>
            </p>
            <p className="text-sm text-foreground-muted mb-6">
              You&apos;re currently signed in as <strong>{session.user.email}</strong>.
              Please sign out and sign in with the correct account.
            </p>
            <Link
              href="/sign-out"
              className="block w-full px-6 py-3 bg-background-muted text-foreground font-medium rounded-lg hover:bg-background-hover transition-colors"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in with correct email - show accept button
  return (
    <div className="min-h-screen bg-background-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="p-4 bg-primary-subtle-hover rounded-full inline-block mb-4">
            <Users className="h-12 w-12 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Join {invite.community.name}
          </h1>
          {invite.community.description && (
            <p className="text-foreground-muted mb-4 italic">
              &quot;{invite.community.description}&quot;
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted mb-6">
            <Users className="h-4 w-4" />
            <span>{invite.community.memberCount} members</span>
          </div>

          <AcceptInviteButton token={token} />

          <Link
            href="/"
            className="block mt-4 text-sm text-foreground-muted hover:text-foreground"
          >
            Decline and go home
          </Link>
        </div>
      </div>
    </div>
  );
}
