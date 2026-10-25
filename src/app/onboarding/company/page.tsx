"use client";

import { Building2, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { TruckArt } from "@/components/brand/illustrations";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api, errorMessage } from "@/lib/api";
import { PHONE_RE } from "@/lib/constants";

export default function CompanySetupPage() {
  const { profile } = useAuth();
  // Owners from before company names were unique confirm the name they already entered.
  const confirming = Boolean(profile?.companyName);
  const [ownerName, setOwnerName] = useState(profile?.displayName ?? "");
  const [name, setName] = useState(profile?.companyName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [errors, setErrors] = useState<{ owner?: string; company?: string; phone?: string }>({});
  const phoneFromLogin = Boolean(profile?.phone);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!ownerName.trim()) found.owner = "Enter your name";
    if (!name.trim()) found.company = "Enter your company name";
    if (!PHONE_RE.test(phone)) found.phone = "Enter a valid 10-digit mobile number";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api("/api/me/company", { body: { ownerName: ownerName.trim(), companyName: name.trim(), phone, address: address.trim() } });
    } catch (err) {
      // Almost always about the company name (already registered).
      setErrors({ company: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,0.9fr)] lg:items-center lg:gap-10">
      <form onSubmit={submit} noValidate>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{confirming ? "Confirm your details" : "Your company"}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {confirming
            ? "Drivers now choose their company when they sign up, so each company name is registered once. Add your name and confirm your company to continue."
            : "Drivers find you by your name and company name when they sign up, and only they are shown to you. Each company name can be registered once."}
        </p>

        <Field label="Owner name" required error={errors.owner} className="mt-6">
          <Input
            value={ownerName}
            autoFocus={!ownerName}
            maxLength={80}
            placeholder="Ramesh Patil"
            autoComplete="name"
            invalid={Boolean(errors.owner)}
            onChange={(e) => {
              setOwnerName(e.target.value);
              setErrors((x) => ({ ...x, owner: undefined }));
            }}
          />
        </Field>

        <Field label="Company name" required error={errors.company} className="mt-5">
          <Input
            value={name}
            maxLength={100}
            placeholder="Shree Ganesh Transport"
            invalid={Boolean(errors.company)}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((x) => ({ ...x, company: undefined }));
            }}
          />
        </Field>

        <Field label="Mobile number" required={!phoneFromLogin} hint={phoneFromLogin ? "From login" : undefined} error={errors.phone} className="mt-5">
          <Input
            value={phoneFromLogin ? `+91 ${phone}` : phone}
            disabled={phoneFromLogin}
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            invalid={Boolean(errors.phone)}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setErrors((x) => ({ ...x, phone: undefined }));
            }}
          />
        </Field>

        <Field label="Address" hint="Optional" className="mt-5">
          <Textarea value={address} maxLength={250} rows={2} placeholder="Office address, city, PIN" onChange={(e) => setAddress(e.target.value)} />
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
