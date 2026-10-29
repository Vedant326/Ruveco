import type { Metadata } from "next";
import { Suspense } from "react";
import { FullLoader } from "@/components/ui/misc";
import { PrivateTrackingView } from "./private-view";

export const metadata: Metadata = {
  title: "Track delivery",
  // Tracking links are private: keep them out of search engines.
  robots: { index: false, follow: false },
};

export default function PrivateTrackingPage() {
  return (
    <Suspense fallback={<FullLoader />}>
      <PrivateTrackingView />
    </Suspense>
  );
}
