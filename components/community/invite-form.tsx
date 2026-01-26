"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { sendInviteSchema, type SendInviteInput } from "@/lib/validations/invite";
import { sendCommunityInvite } from "@/lib/actions/invite";

interface InviteFormProps {
  communityId: string;
  onInviteSent?: () => void;
}

export function InviteForm({ communityId, onInviteSent }: InviteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SendInviteInput>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      communityId,
      email: "",
    },
  });

  const onSubmit = async (data: SendInviteInput) => {
    setIsSubmitting(true);

    const result = await sendCommunityInvite(data);

    if (result.success) {
      toast.success("Invitation sent successfully!");
      reset();
      onInviteSent?.();
    } else {
      toast.error(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            id="email"
            type="email"
            {...register("email")}
            placeholder="person@example.com"
            disabled={isSubmitting}
            className="block w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          An email invitation will be sent. They must sign in with this email to accept.
        </p>
      </div>

      <input type="hidden" {...register("communityId")} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                   hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Invitation"
        )}
      </button>
    </form>
  );
}
