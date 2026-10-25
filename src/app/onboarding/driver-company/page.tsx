"use client";

import { Building2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CompanySelect } from "@/components/company-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Option } from "@/components/ui/search-select";
import { api, errorMessage } from "@/lib/api";

/** For drivers who completed their profile before choosing a company was required. */
export default function DriverCompanyPage() {
  const [company, setCompany] = useState<Option | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company) return setError("Choose your company");
    setBusy(true);
    setError(null);
    try {
      // The profile listener picks up the company and opens the driver home.
      await api("/api/driver/company", { body: { companyId: company.value } });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-lg">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Building2 className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Choose your company</h1>
      <p className="mt-1.5 text-sm text-muted">Pick the transport company you drive for. Only its owner can assign trips to you.</p>

      <Field as="div" label="Your company" required error={error} className="mt-6">
        <CompanySelect value={company} onChange={(o) => (setCompany(o), setError(null))} invalid={Boolean(error)} />
      </Field>

      <Button type="submit" block size="lg" className="mt-6" loading={busy}>
        Continue
      </Button>
    </form>
  );
}
