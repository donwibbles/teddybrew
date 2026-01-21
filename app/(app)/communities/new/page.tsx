import { CreateCommunityForm } from "@/components/community/create-community-form";

export const metadata = {
  title: "Create Community - Hive Community",
  description: "Create a new community",
};

export default function CreateCommunityPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create a Community
        </h1>
        <p className="text-neutral-600 mt-1">
          Start a new community and bring people together
        </p>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-6 sm:p-8">
        <CreateCommunityForm />
      </div>
    </div>
  );
}
