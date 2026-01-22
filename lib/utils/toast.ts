import { toast } from "sonner";

/**
 * Toast notification utilities
 * Wraps Sonner toast for consistent notification behavior across the app
 */

export interface ToastOptions {
  description?: string;
  duration?: number;
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  toast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
}

/**
 * Show error toast
 */
export function showErrorToast(message: string, options?: ToastOptions) {
  toast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
  });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string, options?: ToastOptions) {
  toast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string, options?: ToastOptions) {
  toast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
  });
}

/**
 * Show loading toast with promise
 * Automatically shows success/error based on promise resolution
 */
export function showLoadingToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Dismiss specific toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
