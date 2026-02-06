"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { acceptInvite } from "@/lib/actions/invite";

interface AcceptInviteButtonProps {
  token: string;
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);

    const result = await acceptInvite({ token });

    if (result.success) {
      setIsSuccess(true);
      toast.success("Welcome to the community!");
      // Redirect to community page after a short delay
      setTimeout(() => {
        router.push(`/communities/${result.data.communitySlug}`);
      }, 1500);
    } else {
      toast.error(result.error);
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 bg-success-100 rounded-full">
          <CheckCircle className="h-8 w-8 text-success-600" />
        </div>
        <p className="text-success-600 font-medium">Joined successfully!</p>
        <p className="text-sm text-foreground-muted">Redirecting to community...</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleAccept}
      disabled={isLoading}
      className="w-full px-6 py-3 bg-primary-500 text-white font-medium rounded-lg
                 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                 flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Joining...
        </>
      ) : (
        "Accept Invitation"
      )}
    </button>
  );
}
