import { auth } from "@/lib/auth";

export const metadata = {
  title: "Communities - Hive Community",
  description: "Discover and join communities",
};

export default async function CommunitiesPage() {
  const session = await auth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Communities</h1>
        <p className="text-zinc-600 mt-1">
          Welcome back, {session?.user?.name || session?.user?.email}!
        </p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-zinc-900 mb-2">
          No communities yet
        </h2>
        <p className="text-zinc-600 text-sm mb-4">
          Community features will be implemented in Phase 4.
        </p>
        <p className="text-zinc-500 text-xs">
          Authentication is working! You are signed in as {session?.user?.email}
        </p>
      </div>
    </div>
  );
}
