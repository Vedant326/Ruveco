"use client";

import { doc, getDoc } from "firebase/firestore";
import { BadgeCheck, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, Detail, SkeletonList } from "@/components/ui/misc";
import { fb } from "@/lib/firebase/client";
import { fmtDate, fmtPhone } from "@/lib/format";

interface DriverRecord {
  name: string;
  phone: string;
  address: string;
  licenseNumber: string;
  email: string;
  companyName?: string;
  consentAt: number;
}

export default function DriverProfileViewPage() {
  const { user, signOut } = useAuth();
  const [driver, setDriver] = useState<DriverRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(fb().db, "drivers", user.uid))
      .then((snap) => setDriver((snap.data() as DriverRecord | undefined) ?? null))
      .catch(() => {});
  }, [user]);

  return (
    <>
      <PageHeader title="Profile" back="/driver" />
      {!driver ? (
        <SkeletonList rows={2} />
      ) : (
        <div className="space-y-4">
          <Card className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-700 text-2xl font-extrabold text-white">
              {driver.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink">{driver.name}</p>
              <p className="text-sm text-muted">{fmtPhone(driver.phone)}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Profile complete
              </p>
            </div>
          </Card>
          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Driving license number">{driver.licenseNumber}</Detail>
              <Detail label="Email">{driver.email || "Not added"}</Detail>
              <Detail label="Company" className="sm:col-span-2">
                {driver.companyName}
              </Detail>
              <Detail label="Address" className="sm:col-span-2">
                {driver.address}
              </Detail>
              <Detail label="Location and photo consent given">{fmtDate(driver.consentAt)}</Detail>
            </dl>
          </Card>
          <Button variant="outline" block icon={<LogOut className="h-4 w-4" />} onClick={signOut}>
            Sign out
          </Button>
        </div>
      )}
    </>
  );
}
