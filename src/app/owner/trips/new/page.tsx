"use client";

import { FileText, Plus, Route as RouteIcon, Truck, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { useOwnerData } from "@/components/data-providers";
import { PlaceInput } from "@/components/place-input";
import { AddDocumentSheet, uploadTripDocument, type PendingDocument } from "@/components/trip/documents";
import { AddGoodsSheet, GoodsTable, type NewGoodsItem } from "@/components/trip/goods-card";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, EmptyState, SkeletonList, Spinner, StatusBadge } from "@/components/ui/misc";
import { SearchSelect, type Option } from "@/components/ui/search-select";
import { api, errorMessage } from "@/lib/api";
import { DOC_TYPES, PHONE_RE } from "@/lib/constants";
import { fmtDuration, fmtKm, fmtPhone, todayIST } from "@/lib/format";
import type { DriverSummary, Place } from "@/lib/types";

type ErrorKey = "vehicle" | "date" | "driver" | "source" | "destination" | "pickup" | "delivery" | "receiverName" | "receiverPhone";

function SectionLabel({ step, children }: { step: number; children: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-bold text-ink">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{step}</span>
      {children}
    </h2>
  );
}

export default function CreateTripPage() {
  const router = useRouter();
  const { vehicles } = useOwnerData();
  const today = todayIST();

  const [vehicle, setVehicle] = useState<Option | null>(null);
  const [driver, setDriver] = useState<Option | null>(null);
  const [date, setDate] = useState(today);
  const [source, setSource] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [goods, setGoods] = useState("");
  const [goodsItems, setGoodsItems] = useState<NewGoodsItem[]>([]);
  const [goodsOpen, setGoodsOpen] = useState(false);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [docOpen, setDocOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [busy, setBusy] = useState(false);

  // Driver search runs on the server so owners only ever see name and phone.
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchId = useRef(0);
  const searchDrivers = (query: string) => {
    clearTimeout(searchTimer.current);
    setDriversLoading(true);
    searchTimer.current = setTimeout(async () => {
      const id = ++searchId.current;
      try {
        const res = await api<{ drivers: DriverSummary[] }>(`/api/drivers?q=${encodeURIComponent(query.trim())}`);
        if (id === searchId.current) setDrivers(res.drivers.map((d) => ({ value: d.uid, label: d.name, sub: fmtPhone(d.phone) })));
      } catch {
        if (id === searchId.current) setDrivers([]);
      } finally {
        if (id === searchId.current) setDriversLoading(false);
      }
    }, 300);
  };
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Distance appears as soon as both places are chosen.
  const [route, setRoute] = useState<{ key: string; distanceKm: number; durationMin: number } | null>(null);
  const routeKey = source && destination ? `${source.lat},${source.lng}|${destination.lat},${destination.lng}` : null;
  useEffect(() => {
    if (!routeKey || !source || !destination) return;
    let cancelled = false;
    api<{ distanceKm: number; durationMin: number }>("/api/directions", { body: { from: source, to: destination } })
      .then((res) => !cancelled && setRoute({ key: routeKey, ...res }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [routeKey, source, destination]);
  const distance = route && route.key === routeKey ? route : null;

  const clear = (key: ErrorKey) => setErrors((e) => ({ ...e, [key]: undefined }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const pickupAt = pickup ? new Date(pickup).getTime() : NaN;
    const deliveryAt = delivery ? new Date(delivery).getTime() : NaN;

    const found: Partial<Record<ErrorKey, string>> = {};
    if (!vehicle) found.vehicle = "Choose a vehicle";
    if (!date) found.date = "Choose a date";
    else if (date < today) found.date = "Date cannot be in the past";
    if (!driver) found.driver = "Choose a driver";
    if (!source) found.source = "Pick the pickup place from the suggestions";
    if (!destination) found.destination = "Pick the drop place from the suggestions";
    else if (source && source.lat === destination.lat && source.lng === destination.lng) found.destination = "Destination must be different from source";
    if (!Number.isFinite(pickupAt)) found.pickup = "Choose the pickup time";
    if (!Number.isFinite(deliveryAt)) found.delivery = "Choose the delivery time";
    else if (Number.isFinite(pickupAt) && deliveryAt <= pickupAt) found.delivery = "Delivery time must be after pickup time";
    if (!receiverName.trim()) found.receiverName = "Enter the receiver name";
    if (!PHONE_RE.test(receiverPhone)) found.receiverPhone = "Enter a valid 10-digit mobile number";
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setBusy(true);
    try {
      const created = await api<{ id: string; tripCode: string }>("/api/trips", {
        body: {
          vehicleId: vehicle!.value,
          driverId: driver!.value,
          date,
          source,
          destination,
          pickupAt,
          deliveryAt,
          receiverName: receiverName.trim(),
          receiverPhone,
          goodsDescription: goods.trim(),
          goods: goodsItems,
        },
      });

      // Documents need the trip ID, so they are uploaded right after the trip is saved.
      let failed = 0;
      for (const doc of documents) {
        try {
          await uploadTripDocument(created.id, doc);
        } catch {
          failed += 1;
        }
      }
      if (failed) toast.warning(`Trip ${created.tripCode} created, but ${failed} document${failed > 1 ? "s" : ""} could not be uploaded. Add them from the trip page.`);
      else toast.success(`Trip ${created.tripCode} created`);
      router.push(`/owner/trips/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  if (vehicles.loading) return <SkeletonList rows={4} />;
  if (vehicles.items.length === 0) {
    return (
      <>
        <PageHeader title="Create Trip" back="/owner" />
        <Card>
          <EmptyState
            title="Add a vehicle first"
            text="A trip needs one of your registered vehicles."
            action={
              <Link href="/owner/vehicles" className={buttonClass()}>
                <Plus className="h-4 w-4" /> Add Vehicle
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const vehicleOptions = vehicles.items.map((v): Option => ({ value: v.id, label: v.number, sub: `${v.type} · ${v.company}` }));

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Create Trip" subtitle="Trip ID is automatic" back="/owner" right={<StatusBadge status="scheduled" />} />

      <div className="space-y-4">
        <Card>
          <SectionLabel step={1}>Vehicle and driver</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field as="div" label="Vehicle" required error={errors.vehicle}>
              <SearchSelect
                value={vehicle}
                onChange={(o) => (setVehicle(o), clear("vehicle"))}
                options={vehicleOptions}
                title="Choose a vehicle"
                placeholder="Choose a vehicle"
                searchPlaceholder="Search by number"
                invalid={Boolean(errors.vehicle)}
                icon={<Truck className="h-4 w-4" />}
              />
            </Field>
            <Field label="Date" required error={errors.date}>
              <Input type="date" value={date} min={today} invalid={Boolean(errors.date)} onChange={(e) => (setDate(e.target.value), clear("date"))} />
            </Field>
            <Field as="div" label="Driver" required error={errors.driver} className="sm:col-span-2">
              <SearchSelect
                value={driver}
                onChange={(o) => (setDriver(o), clear("driver"))}
                options={drivers}
                onSearch={searchDrivers}
                loading={driversLoading}
                title="Choose a driver"
                placeholder="Search by name or phone"
                searchPlaceholder="Name or phone number"
                emptyText="No driver found. Drivers show here after they sign up and choose your company."
                invalid={Boolean(errors.driver)}
                icon={<User className="h-4 w-4" />}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel step={2}>Route</SectionLabel>
          <div className="space-y-4">
            <Field as="div" label="Source (pickup)" required error={errors.source}>
              <PlaceInput value={source} onChange={(p) => (setSource(p), clear("source"))} placeholder="Search pickup place" invalid={Boolean(errors.source)} />
            </Field>
            <Field as="div" label="Destination (drop)" required error={errors.destination}>
              <PlaceInput
                value={destination}
                onChange={(p) => (setDestination(p), clear("destination"))}
                placeholder="Search drop place"
                tone="destination"
                invalid={Boolean(errors.destination)}
              />
            </Field>

            {routeKey && (
              <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3 text-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand-600">
                  <RouteIcon className="h-4 w-4" />
                </span>
                {distance ? (
                  <span className="font-semibold text-ink">
                    {fmtKm(distance.distanceKm)} <span className="font-medium text-muted">· about {fmtDuration(distance.durationMin * 60)} driving</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-muted">
                    <Spinner className="h-4 w-4" /> Calculating distance
                  </span>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup time" required error={errors.pickup}>
                <Input type="datetime-local" value={pickup} invalid={Boolean(errors.pickup)} onChange={(e) => (setPickup(e.target.value), clear("pickup"))} />
              </Field>
              <Field label="Delivery time" required error={errors.delivery}>
                <Input type="datetime-local" value={delivery} min={pickup || undefined} invalid={Boolean(errors.delivery)} onChange={(e) => (setDelivery(e.target.value), clear("delivery"))} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel step={3}>Receiver</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Receiver name" required error={errors.receiverName}>
              <Input value={receiverName} maxLength={80} placeholder="Suresh Traders" invalid={Boolean(errors.receiverName)} onChange={(e) => (setReceiverName(e.target.value), clear("receiverName"))} />
            </Field>
            <Field label="Receiver phone" required error={errors.receiverPhone}>
              <span className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted">+91</span>
                <Input
                  value={receiverPhone}
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  className="pl-14"
                  invalid={Boolean(errors.receiverPhone)}
                  onChange={(e) => (setReceiverPhone(e.target.value.replace(/\D/g, "").slice(0, 10)), clear("receiverPhone"))}
                />
              </span>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel step={4}>Goods and documents</SectionLabel>
          <Field label="Goods description" hint={`${goods.length}/200`}>
            <Textarea value={goods} maxLength={200} rows={3} placeholder="What is being carried (optional)" onChange={(e) => setGoods(e.target.value)} />
          </Field>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Goods items</span>
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setGoodsOpen(true)}>
                Add item
              </Button>
            </div>
            {goodsItems.length === 0 ? (
              <p className="text-sm text-muted">Each item with its weight (kg, ton, quintal...) and quantity. You can also add them later.</p>
            ) : (
              <GoodsTable goods={goodsItems} onRemove={(i) => setGoodsItems((list) => list.filter((_, j) => j !== i))} />
            )}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Documents</span>
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDocOpen(true)}>
                Add
              </Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted">E-way bill, GST bill or other files. You can also add them later.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {doc.type === "other" ? doc.name : DOC_TYPES.find((d) => d.value === doc.type)?.label}
                      </p>
                      <p className="truncate text-xs text-muted">{doc.file.name}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove document"
                      onClick={() => setDocuments((list) => list.filter((_, j) => j !== i))}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="flex gap-3 pt-1">
          <Link href="/owner" className={buttonClass("outline", "lg")}>
            Cancel
          </Link>
          <Button type="submit" size="lg" block loading={busy}>
            Create trip
          </Button>
        </div>
      </div>

      <AddGoodsSheet open={goodsOpen} onClose={() => setGoodsOpen(false)} onAdd={(item) => setGoodsItems((list) => [...list, item])} />
      <AddDocumentSheet types={DOC_TYPES} open={docOpen} onClose={() => setDocOpen(false)} onAdd={(doc) => setDocuments((list) => [...list, doc])} />
    </form>
  );
}
