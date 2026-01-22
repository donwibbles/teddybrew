import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-neutral-400">404</span>
          </div>
          <CardTitle className="text-xl text-neutral-900">Page Not Found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Link href="/" className="w-full">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
            <Link href="/communities" className="w-full">
              <Button variant="outline" className="w-full">
                Browse Communities
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
