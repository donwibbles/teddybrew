import "server-only";

import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

/**
 * Verify that the current user is a system admin
 * Redirects to /communities if not admin
 */
export async function verifyAdmin() {
  const { userId } = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/communities");
  }

  return { userId };
}

/**
 * Check if a user is a system admin without redirecting
 * Returns false if not authenticated or not admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  return user?.isAdmin === true;
}
