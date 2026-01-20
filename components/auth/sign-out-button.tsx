"use client";

import { handleSignOut } from "@/lib/actions/auth";
import { useTransition } from "react";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await handleSignOut();
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={className}
      aria-label="Sign out"
    >
      {isPending ? "Signing out..." : children || "Sign out"}
    </button>
  );
}
