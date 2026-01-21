"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Dev-only login form that bypasses email verification
 * This component should only be rendered when NODE_ENV === "development"
 */
export function DevLoginForm() {
  const [email, setEmail] = useState("alice@example.com");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign in");
      }

      // Refresh the page to pick up the new session
      router.refresh();
      router.push("/communities");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleDevLogin} className="space-y-4">
      <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
        <p className="text-xs text-primary-800 font-medium">
          Development Only - Skip email verification
        </p>
      </div>

      <div>
        <label
          htmlFor="dev-email"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Quick login as
        </label>
        <select
          id="dev-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-neutral-50 disabled:text-neutral-500"
        >
          <option value="alice@example.com">alice@example.com (seed user)</option>
          <option value="bob@example.com">bob@example.com (seed user)</option>
          <option value="charlie@example.com">charlie@example.com (seed user)</option>
          <option value="dev@example.com">dev@example.com (new user)</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-error-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg
                   hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isLoading ? "Signing in..." : "Dev Login (Skip Email)"}
      </button>
    </form>
  );
}
