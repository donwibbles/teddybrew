// Auth.js configuration (placeholder for Phase 3)
// This will be fully implemented in Phase 3 with Auth.js v5 and magic links

export interface Session {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

export async function auth(): Promise<Session | null> {
  // Placeholder - will be implemented in Phase 3
  return null;
}
