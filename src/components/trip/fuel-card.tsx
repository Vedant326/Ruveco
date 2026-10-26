"use client";

import { CircleCheck, Fuel, IndianRupee, MapPin, Plus, Receipt, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { cx, fmtDateTime, fmtRupees } from "@/lib/format";
import type { FuelEntry, Trip } from "@/lib/types";
import { openFile, safeFileName, saveWithRetry, uploadFile, validateFile } from "@/lib/uploads";

const numeric = (value: string) => value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const litresText = (n: number) => `${Math.round(n * 100) / 100} L`;
const mapLink = (l: NonNullable<FuelEntry["location"]>) => `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;

/** The trip's fuel entries, newest first. A trip from before entries existed shows its single total as one. */
export function fuelEntriesOf(trip: Trip): FuelEntry[] {
  if (trip.fuelEntries) return [...trip.fuelEntries].sort((a, b) => b.at - a.at);
  if (trip.totalFuel == null && trip.fuelCost == null) return [];
  return [
    { id: "earlier", litres: trip.totalFuel ?? 0, cost: trip.fuelCost ?? 0, billPath: null, billFileName: null, location: null, at: trip.startedAt ?? trip.createdAt },
  ];
}

/** The phone's position right now, or null when location is off or slow. */
function currentLocation(): Promise<FuelEntry["location"]> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

async function viewBill(path: string) {
  try {
    await openFile(path);
  } catch {
    toast.error("Could not open this bill. Please try again.");
  }
}

/**
 * Each time the driver filled fuel: litres, cost, a photo of the bill and where it happened.
 * The driver adds and removes entries; the owner sees them read-only.
 */
export function FuelCard({ trip, canEdit }: { trip: Trip; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const entries = fuelEntriesOf(trip);

  const remove = async (entry: FuelEntry) => {
    if (!window.confirm(`Remove this fuel entry (${litresText(entry.litres)}, ${fmtRupees(entry.cost)})?`)) return;
    setRemoving(entry.id);
    try {
      await api(`/api/trips/${trip.id}/fuel-remove`, { body: { entryId: entry.id } });
      toast.success("Fuel entry removed");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card>
      <SectionTitle
        action={
          canEdit && (
            <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add fuel
            </Button>
          )
        }
      >
        Fuel
      </SectionTitle>

      {entries.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-brand-50/70 p-3 text-center">
          <div>
            <p className="text-base font-extrabold text-ink">{litresText(trip.totalFuel ?? 0)}</p>
            <p className="text-xs text-muted">Total fuel</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-ink">{fmtRupees(trip.fuelCost ?? 0)}</p>
            <p className="text-xs text-muted">Total cost</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-ink">{entries.length}</p>
            <p className="text-xs text-muted">{entries.length === 1 ? "Entry" : "Entries"}</p>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <Fuel className="h-4 w-4 shrink-0" />
          {canEdit ? "Add each time you fill fuel, with a photo of the bill." : "The driver adds fuel here with the bill and location."}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-line p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Fuel className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">
                  {litresText(e.litres)} · {fmtRupees(e.cost)}
                </p>
                <p className="text-xs text-muted">{e.id === "earlier" ? "Entered before fuel bills were added" : fmtDateTime(e.at)}</p>
                {(e.billPath || e.location) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    {e.billPath && (
                      <button type="button" onClick={() => viewBill(e.billPath!)} className="inline-flex cursor-pointer items-center gap-1 text-brand-700 hover:underline">
                        <Receipt className="h-3.5 w-3.5" /> Bill
                      </button>
                    )}
                    {e.location ? (
                      <a href={mapLink(e.location)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <MapPin className="h-3.5 w-3.5" /> No location
                      </span>
                    )}
                  </div>
                )}
              </div>
              {canEdit && (
                <Button size="sm" variant="ghost" aria-label="Remove fuel entry" loading={removing === e.id} icon={<Trash2 className="h-4 w-4" />} onClick={() => remove(e)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && <AddFuelSheet trip={trip} open={adding} onClose={() => setAdding(false)} />}
    </Card>
  );
}

/** Add fuel: litres, cost and the bill. The location is taken from the phone when it is saved. */
function AddFuelSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const [litres, setLitres] = useState("");
  const [cost, setCost] = useState("");
  const [bill, setBill] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ litres?: string; cost?: string; bill?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const found: typeof errors = {};
    if (!(Number(litres) > 0)) found.litres = "Enter the litres filled";
    if (!(Number(cost) > 0)) found.cost = "Enter the fuel cost";
    if (!bill) found.bill = "Add a photo of the fuel bill";
    else {
      const problem = validateFile(bill);
      if (problem) found.bill = problem;
    }
    setErrors(found);
    if (Object.keys(found).length || !bill) return;

    setBusy(true);
    try {
      const billPath = `trips/${trip.id}/fuel-${crypto.randomUUID()}-${safeFileName(bill.name)}`;
      // The location is read while the bill uploads, so it adds no waiting.
      const [location] = await Promise.all([currentLocation(), uploadFile(billPath, bill)]);
      await saveWithRetry(() =>
        api(`/api/trips/${trip.id}/fuel`, { body: { litres: Number(litres), cost: Number(cost), billPath, billFileName: bill.name, location } }),
      );
      toast.success(location ? "Fuel added" : "Fuel added without location. Turn on location to save it next time.");
      setLitres("");
      setCost("");
      setBill(null);
      onClose();
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add fuel" description="Each time you fill fuel, with a photo of the bill.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fuel filled" hint="litres" required error={errors.litres}>
            <span className="relative block">
              <Fuel className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
              <Input value={litres} inputMode="decimal" placeholder="0" className="pl-11" invalid={Boolean(errors.litres)} onChange={(e) => (setLitres(numeric(e.target.value)), setErrors((x) => ({ ...x, litres: undefined })))} />
            </span>
          </Field>
          <Field label="Fuel cost" hint="₹" required error={errors.cost}>
            <span className="relative block">
              <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
              <Input value={cost} inputMode="decimal" placeholder="0" className="pl-11" invalid={Boolean(errors.cost)} onChange={(e) => (setCost(numeric(e.target.value)), setErrors((x) => ({ ...x, cost: undefined })))} />
            </span>
          </Field>
        </div>

        <Field label="Fuel bill" required error={errors.bill}>
          <span
            className={cx(
              "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4",
              errors.bill ? "border-rose-300 bg-rose-50/40" : "border-brand-200 bg-brand-50/50 hover:border-brand-400",
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-card">
              {bill ? <CircleCheck className="h-5 w-5 text-emerald-600" /> : <Upload className="h-5 w-5" />}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block truncate font-semibold text-ink">{bill ? bill.name : "Take a photo or choose a file"}</span>
              <span className="text-xs text-muted">{bill ? `${(bill.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG or PDF, up to 10 MB"}</span>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="sr-only"
              onChange={(e) => (setBill(e.target.files?.[0] ?? null), setErrors((x) => ({ ...x, bill: undefined })))}
            />
          </span>
        </Field>

        <p className="flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-xs font-medium text-brand-800">
          <MapPin className="h-4 w-4 shrink-0" /> Your current location is saved with this entry.
        </p>

        {errors.form && <p className="text-xs font-medium text-rose-600">{errors.form}</p>}
        <Button block loading={busy} onClick={submit}>
          Save fuel
        </Button>
      </div>
    </Sheet>
  );
}
