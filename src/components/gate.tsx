"use client";

import { Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FullLoader } from "@/components/ui/misc";
import { firebaseConfigured } from "@/lib/firebase/client";
import { homeFor, useAuth } from "./auth-provider";

/**
 * Keeps each part of the app to the right people.
 * `guest` pages are for signed-out users; `member` pages must match where the user's
 * sign-up state says they belong (/owner, /driver or one onboarding step).
 */
export function Gate({ area, children }: { area: "guest" | "member"; children: ReactNode }) {
  const { user, profile, loading, error, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const home = user ? homeFor(profile) : "/login";
  const allowed = area === "guest" ? !user : Boolean(user) && (pathname === home || pathname.startsWith(`${home}/`));
  const ready = firebaseConfigured && !loading && !error;

  useEffect(() => {
    if (ready && !allowed) router.replace(home);
  }, [ready, allowed, home, router]);

  if (!firebaseConfigured) return <SetupNotice />;
  if (loading) return <FullLoader />;
  if (error) {
    return (
      <Notice title="We could not load your account" text={error}>
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </Notice>
    );
  }
  if (!allowed) return <FullLoader />;
  return <>{children}</>;
}

function Notice({ title, text, children }: { title: string; text: ReactNode; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 text-center shadow-card">
        <Logo className="mx-auto" />
        <span className="mx-auto mt-6 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Settings className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        <div className="mt-2 text-sm text-muted">{text}</div>
        {children && <div className="mt-6 flex flex-col gap-2">{children}</div>}
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <Notice
      title="Connect Firebase to continue"
      text={
        <>
          Copy <code className="rounded bg-brand-50 px-1 font-semibold text-brand-700">.env.example</code> to{" "}
          <code className="rounded bg-brand-50 px-1 font-semibold text-brand-700">.env.local</code>, fill in your Firebase
          keys and restart the server. To try the app with no Firebase project, run{" "}
          <code className="rounded bg-brand-50 px-1 font-semibold text-brand-700">npm run dev:local</code>. The steps are in
          SETUP.md.
        </>
      }
    />
  );
}
