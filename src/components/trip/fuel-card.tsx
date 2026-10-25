"use client";

import { Fuel, IndianRupee } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { api, errorMessage } from "@/lib/api";
import type { Trip } from "@/lib/types";

const numeric = (value: string) => value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const text = (value: number | null | undefined) => value?.toString() ?? "";

/**
 * The driver's fuel figures: litres filled and what it cost. The owner sees them read-only.
 * Give it a `key` built from the saved values, so it resets when they change.
 */
export function FuelCard({ trip }: { trip: Trip }) {
  const [fuel, setFuel] = useState(text(trip.totalFuel));
  const [cost, setCost] = useState(text(trip.fuelCost));
  const [busy, setBusy] = useState(false);

  const dirty = fuel !== text(trip.totalFuel) || cost !== text(trip.fuelCost);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/trips/${trip.id}/fuel`, {
        body: { totalFuel: fuel === "" ? null : Number(fuel), fuelCost: cost === "" ? null : Number(cost) },
      });
      toast.success("Fuel saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Fuel</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fuel filled" hint="litres">
          <span className="relative block">
            <Fuel className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <Input value={fuel} inputMode="decimal" placeholder="Optional" className="pl-11" onChange={(e) => setFuel(numeric(e.target.value))} />
          </span>
        </Field>
        <Field label="Fuel cost" hint="₹">
          <span className="relative block">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <Input value={cost} inputMode="decimal" placeholder="Optional" className="pl-11" onChange={(e) => setCost(numeric(e.target.value))} />
          </span>
        </Field>
      </div>
      <p className="mt-2 text-xs text-muted">Your owner sees these on the trip.</p>
      {dirty && (
        <Button size="sm" className="mt-3" loading={busy} onClick={save}>
          Save fuel
        </Button>
      )}
    </Card>
  );
}
