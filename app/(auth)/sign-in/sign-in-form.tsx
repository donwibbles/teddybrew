"use client";

import { useActionState } from "react";
import { requestMagicLink, type SignInState } from "@/lib/actions/auth";
import { useEffect, useRef } from "react";

interface SignInFormProps {
  callbackUrl?: string;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    requestMagicLink,
    {}
  );

  const formRef = useRef<HTMLFormElement>(null);

  // Redirect to verify-request on success
  useEffect(() => {
    if (state.success) {
      const params = new URLSearchParams();
      if (callbackUrl) {
        params.set("callbackUrl", callbackUrl);
      }
      const query = params.toString();
      window.location.href = `/verify-request${query ? `?${query}` : ""}`;
    }
  }, [state.success, callbackUrl]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          placeholder="you@example.com"
          aria-describedby={state.error ? "email-error" : undefined}
          className="w-full px-4 py-2.5 border border-border rounded-lg text-foreground placeholder-foreground-muted
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:bg-background-muted disabled:text-foreground-muted"
        />
        {state.error && (
          <p id="email-error" className="mt-2 text-sm text-error-600" role="alert">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-primary-subtle0 text-white font-medium rounded-lg
                   hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            Sending magic link...
          </span>
        ) : (
          "Send magic link"
        )}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        We&apos;ll send you a magic link to sign in. No password needed.
      </p>
    </form>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
