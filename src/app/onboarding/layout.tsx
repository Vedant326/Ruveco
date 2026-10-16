import { Suspense, type ReactNode } from "react";
import { OnboardingShell } from "@/components/shells";
import { FullLoader } from "@/components/ui/misc";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullLoader />}>
      <OnboardingShell>{children}</OnboardingShell>
    </Suspense>
  );
}
