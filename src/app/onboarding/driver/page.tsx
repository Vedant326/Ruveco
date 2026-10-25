"use client";

import { Camera, CircleCheck, ImageUp, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { CompanySelect } from "@/components/company-select";
import { FaceCapture } from "@/components/face-capture";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Option } from "@/components/ui/search-select";
import { api, errorMessage } from "@/lib/api";
import { PHONE_RE } from "@/lib/constants";
import { cx } from "@/lib/format";
import { uploadFile, validateFile } from "@/lib/uploads";

type Errors = Partial<Record<"name" | "phone" | "company" | "address" | "license" | "licensePhoto" | "email" | "face" | "consent" | "form", string>>;

export default function DriverProfilePage() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [company, setCompany] = useState<Option | null>(null);
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [face, setFace] = useState<{ blob: Blob; url: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const phoneFromLogin = Boolean(profile?.phone);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = "Enter your name";
    if (!PHONE_RE.test(phone)) e.phone = "Enter a valid 10-digit mobile number";
    if (!company) e.company = "Choose your company";
    if (!address.trim()) e.address = "Enter your address";
    if (license.trim().length < 4) e.license = "Enter your driving license number";
    if (!licensePhoto) e.licensePhoto = "Upload a photo of your license";
    else {
      const problem = validateFile(licensePhoto, true);
      if (problem) e.licensePhoto = problem;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address";
    if (!face) e.face = "Take a face photo";
    if (!consent) e.consent = "Please accept to continue";
    return e;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length || !user || !licensePhoto || !face) return;

    setBusy(true);
    try {
      const stamp = Date.now();
      const ext = licensePhoto.type === "image/png" ? "png" : "jpg";
      const licensePhotoPath = `drivers/${user.uid}/license-${stamp}.${ext}`;
      const facePhotoPath = `drivers/${user.uid}/face-${stamp}.jpg`;
      await Promise.all([uploadFile(licensePhotoPath, licensePhoto), uploadFile(facePhotoPath, face.blob)]);
      await api("/api/driver/profile", {
        body: {
          name: name.trim(),
          phone,
          address: address.trim(),
          licenseNumber: license.trim(),
          email: email.trim(),
          companyId: company!.value,
          licensePhotoPath,
          facePhotoPath,
          consent: true,
        },
      });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
      setBusy(false);
    }
  };

  const clear = (key: keyof Errors) => setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2 sm:gap-x-6">
      <div className="sm:col-span-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">Create your profile</h1>
        <p className="mt-1.5 text-sm text-muted">One-time setup. Your company&apos;s owner will find you by your name or phone number.</p>
      </div>

      <Field label="Name" required error={errors.name}>
        <Input value={name} maxLength={80} placeholder="Ramesh Kumar" invalid={Boolean(errors.name)} onChange={(e) => (setName(e.target.value), clear("name"))} />
      </Field>

      <Field label="Phone number" required={!phoneFromLogin} error={errors.phone} hint={phoneFromLogin ? "From login" : undefined}>
        <Input
          value={phoneFromLogin ? `+91 ${phone}` : phone}
          disabled={phoneFromLogin}
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          invalid={Boolean(errors.phone)}
          onChange={(e) => (setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)), clear("phone"))}
        />
      </Field>

      <Field as="div" label="Your company" required error={errors.company} className="sm:col-span-2">
        <CompanySelect value={company} onChange={(o) => (setCompany(o), clear("company"))} invalid={Boolean(errors.company)} />
      </Field>

      <Field label="Address" required error={errors.address} className="sm:col-span-2">
        <Textarea value={address} maxLength={250} rows={2} placeholder="House, street, city, PIN" invalid={Boolean(errors.address)} onChange={(e) => (setAddress(e.target.value), clear("address"))} />
      </Field>

      <Field label="Driving license number" required error={errors.license}>
        <Input value={license} maxLength={30} placeholder="MH12 20110012345" className="uppercase placeholder:normal-case" invalid={Boolean(errors.license)} onChange={(e) => (setLicense(e.target.value), clear("license"))} />
      </Field>

      <Field label="Email" hint="Optional" error={errors.email}>
        <Input value={email} type="email" autoComplete="email" placeholder="you@example.com" invalid={Boolean(errors.email)} onChange={(e) => (setEmail(e.target.value), clear("email"))} />
      </Field>

      <Field label="Driving license photo" required error={errors.licensePhoto}>
        <span
          className={cx(
            "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4",
            errors.licensePhoto ? "border-rose-300 bg-rose-50/40" : "border-brand-200 bg-brand-50/50 hover:border-brand-400",
          )}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-card">
            {licensePhoto ? <CircleCheck className="h-5 w-5 text-emerald-600" /> : <ImageUp className="h-5 w-5" />}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block truncate font-semibold text-ink">{licensePhoto ? licensePhoto.name : "Upload license photo"}</span>
            <span className="text-xs text-muted">Camera or gallery · JPG or PNG, up to 10 MB</span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => (setLicensePhoto(e.target.files?.[0] ?? null), clear("licensePhoto"))}
          />
        </span>
      </Field>


      <Field as="div" label="Face photo" required error={errors.face} hint="Camera only">
        <div className={cx("flex items-center gap-4 rounded-2xl border p-3", errors.face ? "border-rose-300" : "border-line")}>
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-500">
            {face ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of a just-captured blob
              <img src={face.url} alt="Your face photo" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </span>
          <Button
            variant="secondary"
            icon={face ? <RotateCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            onClick={() => setCameraOpen(true)}
          >
            {face ? "Retake" : "Take face photo"}
          </Button>
        </div>
      </Field>

      <label className={cx("flex cursor-pointer gap-3 rounded-2xl p-3 sm:col-span-2", errors.consent ? "bg-rose-50" : "bg-brand-50/60")}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => (setConsent(e.target.checked), clear("consent"))}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
        />
        <span className="text-sm text-ink">
          I agree to share my location during trips and let Ruveco store my photo and license
          <span className="text-rose-500"> *</span>
          {errors.consent && <span className="mt-1 block text-xs font-medium text-rose-600">{errors.consent}</span>}
        </span>
      </label>

      {errors.form && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-700 sm:col-span-2">{errors.form}</p>}

      <Button type="submit" block size="lg" loading={busy} className="sm:col-span-2">
        Save profile
      </Button>

      <FaceCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onUse={(blob) => {
          if (face) URL.revokeObjectURL(face.url);
          setFace({ blob, url: URL.createObjectURL(blob) });
          clear("face");
        }}
      />
    </form>
  );
}
