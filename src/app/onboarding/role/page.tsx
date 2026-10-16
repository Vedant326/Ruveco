"use client";

import { ArrowRight, Building2, IdCard } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { TruckArt } from "@/components/brand/illustrations";
import { Spinner } from "@/components/ui/misc";
import { api, errorMessage } from "@/lib/api";
import type { Role } from "@/lib/types";

const ROLES = [
  {
    role: "driver" as const,
    title: "Driver",
    text: "I drive the vehicle and share my location during trips.",
    icon: IdCard,
    truck: "LCV" as const,
  },
  {
    role: "owner" as const,
    title: "Owner",
    text: "I own vehicles, create trips and assign drivers.",
    icon: Building2,
    truck: "HCV" as const,
  },
];

export default function ChooseRolePage() {
  const [busy, setBusy] = useState<Role | null>(null);

  const choose = async (role: Role) => {
    setBusy(role);
    try {
      // The profile listener picks up the new role and moves to the next step.
      await api("/api/me/role", { body: { role } });
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Are you a driver or owner?</h1>
      <p className="mt-1.5 text-sm text-muted">Choose once. This decides what you see in the app.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:gap-5">
        {ROLES.map((item, i) => (
          <motion.button
            key={item.role}
            type="button"
            disabled={busy !== null}
            onClick={() => choose(item.role)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border-2 border-line bg-white p-5 text-left transition-colors hover:border-brand-400 hover:shadow-card disabled:cursor-wait disabled:opacity-70 lg:p-6"
          >
            <div className="mb-4 flex h-28 items-end justify-center rounded-2xl bg-brand-50 px-3 pt-3 sm:h-36 lg:mb-5 lg:h-44">
              <TruckArt type={item.truck} className="w-full max-w-[200px] sm:max-w-[250px]" />
            </div>
            <span className="flex items-center gap-2 text-lg font-bold text-ink lg:text-xl">
              <item.icon className="h-5 w-5 text-brand-600" /> {item.title}
            </span>
            <span className="mt-1 text-sm text-muted lg:text-[15px]">{item.text}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
              {busy === item.role ? <Spinner className="h-4 w-4" /> : <>Continue as {item.title.toLowerCase()} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
            </span>
          </motion.button>
        ))}
      </div>
    </>
  );
}
