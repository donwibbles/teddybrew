"use client";

import { useState, useCallback, useTransition } from "react";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface UseFormSubmitOptions<TInput, TResult> {
  action: (input: TInput) => Promise<ActionResult<TResult>>;
  onSuccess?: (data: TResult) => void;
  onError?: (error: string) => void;
}

interface UseFormSubmitReturn<TInput, TResult> {
  submit: (input: TInput) => Promise<ActionResult<TResult>>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Custom hook for standardized form submission with loading and error states.
 *
 * @example
 * const { submit, isSubmitting, error, clearError } = useFormSubmit({
 *   action: createPost,
 *   onSuccess: (data) => router.push(`/posts/${data.slug}`),
 *   onError: (error) => toast.error(error),
 * });
 */
export function useFormSubmit<TInput, TResult = void>({
  action,
  onSuccess,
  onError,
}: UseFormSubmitOptions<TInput, TResult>): UseFormSubmitReturn<TInput, TResult> {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: TInput): Promise<ActionResult<TResult>> => {
      setError(null);
      setIsLoading(true);

      try {
        const result = await action(input);

        if (result.success) {
          startTransition(() => {
            onSuccess?.(result.data);
          });
        } else {
          setError(result.error);
          onError?.(result.error);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [action, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submit,
    isSubmitting: isLoading || isPending,
    error,
    clearError,
  };
}
