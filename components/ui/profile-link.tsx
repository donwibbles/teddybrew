import Link from "next/link";

interface ProfileLinkProps {
  user: {
    username?: string | null;
    isPublic?: boolean | null;
    name?: string | null;
  };
  className?: string;
  children?: React.ReactNode;
}

export function ProfileLink({ user, className, children }: ProfileLinkProps) {
  const displayContent = children || user.name || "Anonymous";

  if (user.username && user.isPublic === true) {
    return (
      <Link href={`/u/${user.username}`} className={className}>
        {displayContent}
      </Link>
    );
  }

  return <span className={className}>{displayContent}</span>;
}
