"use client";

import { useState, useEffect } from "react";
import { FolderPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Folder {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: Folder | null;
  onSave: (data: { name: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
}

export function FolderDialog({
  open,
  onOpenChange,
  folder,
  onSave,
}: FolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!folder;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(folder?.name || "");
      setDescription(folder?.description || "");
      setError(null);
    }
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to save folder");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5" />
                Edit Folder
              </>
            ) : (
              <>
                <FolderPlus className="h-5 w-5" />
                Create Folder
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the folder name and description."
              : "Create a new folder to organize your documents."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Getting Started"
                autoFocus
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-description">
                Description <span className="text-foreground-muted">(optional)</span>
              </Label>
              <Input
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this folder"
                disabled={isSaving}
              />
            </div>

            {error && (
              <p className="text-sm text-error-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Save" : "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
