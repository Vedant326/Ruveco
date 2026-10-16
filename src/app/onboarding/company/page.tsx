"use client";

import { Building2, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { TruckArt } from "@/components/brand/illustrations";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api";

export default function CompanySetupPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your company name");
    setBusy(true);
    setError(null);
    try {
      await api("/api/me/company", { body: { companyName: name.trim() } });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,0.9fr)] lg:items-center lg:gap-10">
      <form onSubmit={submit} noValidate>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Your company</h1>
        <p className="mt-1.5 text-sm text-muted">This name is shown on your dashboard and to your drivers.</p>

        <Field label="Company name" required error={error} className="mt-6">
          <Input
            value={name}
            autoFocus
            maxLength={100}
            placeholder="Shree Ganesh Transport"
            invalid={Boolean(error)}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </Field>

        <Button type="submit" block size="lg" className="mt-6" loading={busy}>
          Continue
        </Button>
      </form>

      {/* Laptops only: what the owner gets, so the wide card is not half empty */}
      <div className="hidden rounded-3xl bg-brand-50 p-7 lg:block">
        <TruckArt type="HCV" className="w-full" />
        <ul className="mt-6 space-y-3">
          {["Register your vehicles once", "Create trips and assign drivers", "Share a live tracking link with customers"].map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <CircleCheck className="h-5 w-5 shrink-0 text-brand-600" /> {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
