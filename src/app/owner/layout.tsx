import { Suspense, type ReactNode } from "react";
import { OwnerShell } from "@/components/shells";
import { FullLoader } from "@/components/ui/misc";

// Suspense is required because the shell reads the URL, which is unknown
// while dynamic pages such as /owner/trips/[id] are prerendered.
export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullLoader />}>
      <OwnerShell>{children}</OwnerShell>
    </Suspense>
  );
}
