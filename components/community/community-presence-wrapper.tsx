"use client";

import { CommunityPresenceProvider } from "@/contexts/presence-context";
import { type ReactNode } from "react";

interface MemberData {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommunityPresenceWrapperProps {
  children: ReactNode;
  communityId: string;
  currentUser: MemberData;
}

/**
 * Client component wrapper for CommunityPresenceProvider.
 * Used in the community layout to provide presence context to all child pages.
 */
export function CommunityPresenceWrapper({
  children,
  communityId,
  currentUser,
}: CommunityPresenceWrapperProps) {
  return (
    <CommunityPresenceProvider communityId={communityId} currentUser={currentUser}>
      {children}
    </CommunityPresenceProvider>
  );
}
