"use client";

import { collection, getDocs } from "firebase/firestore";
import { Building2, CircleCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { TruckArt } from "@/components/brand/illustrations";
import { useOwnerData } from "@/components/data-providers";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, EmptyState, ErrorState, SectionTitle, SkeletonList } from "@/components/ui/misc";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { SearchSelect, type Option } from "@/components/ui/search-select";
import { api, errorMessage } from "@/lib/api";
import { normalizePlate, PLATE_RE, VEHICLE_TYPES } from "@/lib/constants";
import fallbackCompanies from "@/lib/data/vehicle-companies.json";
import { fb } from "@/lib/firebase/client";
import { cx } from "@/lib/format";
import type { VehicleType } from "@/lib/types";

/** Vehicle companies from the `vehicleCompanies` table; the bundled list is used until it is seeded. */
function useVehicleCompanies() {
  const [names, setNames] = useState<string[]>(fallbackCompanies);
  useEffect(() => {
    getDocs(collection(fb().db, "vehicleCompanies"))
      .then((snap) => {
        const stored = snap.docs.map((d) => d.get("name") as string).filter(Boolean);
        if (stored.length) setNames([...new Set(stored)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, []);
  return names.map((name): Option => ({ value: name, label: name }));
}

export default function VehiclesPage() {
  const { vehicles } = useOwnerData();
  const companies = useVehicleCompanies();
  const [number, setNumber] = useState("");
  const [type, setType] = useState<VehicleType | null>(null);
  const [company, setCompany] = useState<Option | null>(null);
  const [errors, setErrors] = useState<{ number?: string; type?: string; company?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!PLATE_RE.test(number)) found.number = "Enter a valid vehicle number like MH12AB1234";
    if (!type) found.type = "Choose a vehicle type";
    if (!company) found.company = "Choose a vehicle company";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api("/api/vehicles", { body: { number, type, company: company!.value } });
      toast.success(`${number} added`, { icon: <CircleCheck className="h-4 w-4 text-emerald-600" /> });
      setNumber("");
      setType(null);
      setCompany(null);
    } catch (err) {
      const message = errorMessage(err);
      if (message.includes("already added")) setErrors({ number: message });
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Add Vehicle" subtitle="Register once, pick it in every trip" back="/owner" />

      <Card>
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Vehicle number" required error={errors.number}>
            <Input
              value={number}
              placeholder="MH12AB1234"
              autoCapitalize="characters"
              invalid={Boolean(errors.number)}
              className="font-bold uppercase tracking-widest placeholder:font-medium placeholder:tracking-normal"
              onChange={(e) => {
                setNumber(normalizePlate(e.target.value).slice(0, 11));
                setErrors((x) => ({ ...x, number: undefined }));
              }}
            />
          </Field>

          <Field as="div" label="Vehicle type" required error={errors.type}>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
              {VEHICLE_TYPES.map((option) => {
                const selected = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setType(option.value);
                      setErrors((x) => ({ ...x, type: undefined }));
                    }}
                    className={cx(
                      "flex cursor-pointer flex-col items-center rounded-2xl border-2 px-1.5 pb-2.5 pt-2 text-center transition-colors",
                      selected ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:border-brand-300",
                    )}
                  >
                    <TruckArt type={option.value} className="h-12 w-full" />
                    <span className="mt-1 text-sm font-bold text-ink">{option.label}</span>
                    <span className="text-[11px] leading-tight text-muted">{option.range}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field as="div" label="Vehicle company" required error={errors.company}>
            <SearchSelect
              value={company}
              onChange={(option) => {
                setCompany(option);
                setErrors((x) => ({ ...x, company: undefined }));
              }}
              options={companies}
              title="Vehicle company"
              placeholder="Choose a company"
              searchPlaceholder="Search companies"
              allowCustom
              invalid={Boolean(errors.company)}
              icon={<Building2 className="h-4 w-4" />}
            />
          </Field>

          <Button type="submit" block loading={busy}>
            Save vehicle
          </Button>
        </form>
      </Card>

      <section className="mt-7">
        <SectionTitle>Registered vehicles {vehicles.items.length > 0 && <span className="font-medium text-muted">({vehicles.items.length})</span>}</SectionTitle>
        {vehicles.loading ? (
          <SkeletonList rows={2} />
        ) : vehicles.error ? (
          <ErrorState message="Your vehicles could not be loaded." onRetry={vehicles.retry} />
        ) : vehicles.items.length === 0 ? (
          <Card>
            <EmptyState title="No vehicles yet" text="Add your first vehicle with the form above." />
          </Card>
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {vehicles.items.map((v) => (
              <StaggerItem key={v.id}>
                <div className="flex items-center gap-3 rounded-3xl border border-line/70 bg-white p-3.5 shadow-card">
                  <span className="grid h-14 w-20 shrink-0 place-items-center rounded-2xl bg-brand-50 px-2">
                    <TruckArt type={v.type} className="w-full" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold tracking-wide text-ink">{v.number}</p>
                    <p className="truncate text-sm text-muted">{v.company}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">{v.type}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </>
  );
}
