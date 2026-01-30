"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccount } from "@/lib/actions/profile";
import { toast } from "sonner";

export function DeleteAccountDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmationValid = confirmationPhrase === "delete my account";

  const handleDelete = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteAccount({ confirmationPhrase });

      if (result.success) {
        toast.success("Account deleted successfully");
        // Redirect to home page (auth will handle sign-out)
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setConfirmationPhrase("");
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="text-error-600 border-error-300 hover:bg-error-50 hover:text-error-700"
        >
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All your data will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-error-50 p-4 text-sm text-error-800">
            <p className="font-medium mb-2">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1 text-error-700">
              <li>Your profile and account information</li>
              <li>All your posts, comments, and messages</li>
              <li>Your memberships in all communities</li>
              <li>Your RSVPs and event history</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmation"
              className="text-sm font-medium text-neutral-700"
            >
              Type <span className="font-mono text-error-600">delete my account</span> to confirm:
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder="delete my account"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-error-500 focus:border-transparent"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-error-600 bg-error-50 p-3 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
