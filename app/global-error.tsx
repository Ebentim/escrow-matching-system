"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background flex-col gap-4 p-4 text-center">
          <h2 className="text-2xl font-bold text-destructive">Something went wrong!</h2>
          <p className="text-muted-foreground max-w-md">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
          <Button onClick={() => reset()} size="lg">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
