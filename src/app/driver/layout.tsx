import { Suspense, type ReactNode } from "react";
import { DriverShell } from "@/components/shells";
import { FullLoader } from "@/components/ui/misc";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullLoader />}>
      <DriverShell>{children}</DriverShell>
    </Suspense>
  );
}
