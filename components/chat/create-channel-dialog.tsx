"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createChannel } from "@/lib/actions/channel";
import { toast } from "sonner";

const createChannelFormSchema = z.object({
  name: z
    .string()
    .min(2, "Channel name must be at least 2 characters")
    .max(50, "Channel name must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

type FormData = z.infer<typeof createChannelFormSchema>;

interface CreateChannelDialogProps {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (channelId: string) => void;
}

export function CreateChannelDialog({
  communityId,
  open,
  onOpenChange,
  onSuccess,
}: CreateChannelDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createChannelFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const result = await createChannel({
      communityId,
      name: data.name.toLowerCase(),
      description: data.description,
    });

    if (result.success) {
      toast.success("Channel created");
      reset();
      onOpenChange(false);
      onSuccess?.(result.data.channelId);
    } else {
      toast.error(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Add a new channel to your community. Channel names should be
            lowercase with hyphens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                #
              </span>
              <Input
                id="name"
                {...register("name")}
                placeholder="general-chat"
                className="pl-7"
                disabled={isSubmitting}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-error-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="What's this channel about?"
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-error-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
