"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { restoreVersion, getVersions } from "@/lib/actions/document";

interface Version {
  id: string;
  version: number;
  title: string;
  changeNote: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  onRestore?: () => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  onRestore,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<Version | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load versions when dialog opens
  useEffect(() => {
    if (open && documentId) {
      setIsLoading(true);
      setError(null);

      getVersions({ documentId, limit: 50 })
        .then((result) => {
          if (result.success) {
            setVersions(result.data.versions as Version[]);
          } else {
            setError(result.error || "Failed to load version history");
          }
        })
        .catch(() => {
          setError("Failed to load version history");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, documentId]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!versionToRestore) return;

    setIsRestoring(true);
    setError(null);

    try {
      const result = await restoreVersion({
        documentId,
        versionId: versionToRestore.id,
      });

      if (result.success) {
        setVersionToRestore(null);
        onOpenChange(false);
        onRestore?.();
      } else {
        setError(result.error || "Failed to restore version");
      }
    } catch {
      setError("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  }, [documentId, versionToRestore, onOpenChange, onRestore]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this document.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="py-8 text-center text-error-600">{error}</div>
            ) : versions.length === 0 ? (
              <div className="py-8 text-center text-foreground-muted">
                No version history yet. Versions are created when you publish.
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isLatest={version.version === versions[0]?.version}
                    onRestore={() => setVersionToRestore(version)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!versionToRestore}
        onOpenChange={(open) => !open && setVersionToRestore(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore version {versionToRestore?.version}?
              This will replace the current content with the content from{" "}
              {versionToRestore?.createdAt &&
                format(new Date(versionToRestore.createdAt), "MMM d, yyyy h:mm a")}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={isRestoring}
            >
              {isRestoring ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface VersionItemProps {
  version: Version;
  isLatest: boolean;
  onRestore: () => void;
}

function VersionItem({ version, isLatest, onRestore }: VersionItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={version.author.image || undefined} />
          <AvatarFallback className="text-xs">
            {version.author.name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              Version {version.version}
            </span>
            {isLatest && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                Latest
              </span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">{version.author.name}</p>
          <p className="text-xs text-foreground-muted">
            {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
          </p>
          {version.changeNote && (
            <p className="text-sm text-foreground-muted italic">
              &quot;{version.changeNote}&quot;
            </p>
          )}
        </div>
      </div>

      {!isLatest && (
        <Button variant="outline" size="sm" onClick={onRestore}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restore
        </Button>
      )}
    </div>
  );
}
