"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { WEIGHT_UNITS } from "@/lib/constants";
import type { GoodsItem, Trip } from "@/lib/types";

/** A goods item before it is saved: name, weight with its unit, optional quantity. */
export type NewGoodsItem = Omit<GoodsItem, "id">;

const amount = (n: number) => String(Math.round(n * 1000) / 1000);
const numeric = (value: string) => value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");

/** Weight to show, e.g. "2 ton". Older items stored their kg or ton amount as the quantity. */
export function goodsWeight(g: NewGoodsItem) {
  if (g.weight != null) return `${amount(g.weight)} ${g.weightUnit ?? ""}`.trim();
  if (g.quantity != null && (g.unit === "kg" || g.unit === "ton")) return `${amount(g.quantity)} ${g.unit}`;
  return "–";
}

/** Quantity to show, e.g. "200". Older items with pieces or boxes show their unit too. */
export function goodsQuantity(g: NewGoodsItem) {
  if (g.quantity == null) return "–";
  if (g.weight == null && (g.unit === "kg" || g.unit === "ton")) return "–";
  return g.weight == null && g.unit ? `${amount(g.quantity)} ${g.unit}` : amount(g.quantity);
}

/** The list sent to the server: every field, so older items keep theirs. */
function toBody(goods: NewGoodsItem[]) {
  return goods.map((g) => ({
    item: g.item,
    weight: g.weight ?? null,
    weightUnit: g.weightUnit ?? null,
    quantity: g.quantity ?? null,
    unit: g.unit ?? null,
  }));
}

/** Add goods item: name, weight with a unit dropdown (kg, ton, quintal...), and quantity (optional). */
export function AddGoodsSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  /** May be async; the sheet shows a spinner and stays open if it fails. */
  onAdd: (item: NewGoodsItem) => boolean | void | Promise<boolean | void>;
}) {
  const [item, setItem] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<(typeof WEIGHT_UNITS)[number]>("kg");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const w = Number(weight);
    const q = quantity === "" ? null : Number(quantity);
    if (!item.trim()) return setError("Enter the item name");
    if (!(w > 0)) return setError("Enter the weight");
    if (q !== null && !(q > 0)) return setError("Enter a quantity more than 0");
    setError(null);
    setBusy(true);
    try {
      if ((await onAdd({ item: item.trim(), weight: w, weightUnit, quantity: q, unit: null })) === false) return;
      setItem("");
      setWeight("");
      setQuantity("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add goods item">
      <div className="space-y-4">
        <Field label="Item name" required>
          <Input value={item} maxLength={80} placeholder="Cement bags" onChange={(e) => (setItem(e.target.value), setError(null))} />
        </Field>
        <Field as="div" label="Weight" required>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input value={weight} inputMode="decimal" placeholder="10" aria-label="Weight" onChange={(e) => (setWeight(numeric(e.target.value)), setError(null))} />
            </div>
            <div className="w-28 shrink-0">
              <Select value={weightUnit} aria-label="Weight unit" onChange={(e) => setWeightUnit(e.target.value as typeof weightUnit)}>
                {WEIGHT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Field>
        <Field label="Quantity" hint="Optional">
          <Input value={quantity} inputMode="decimal" placeholder="200" onChange={(e) => (setQuantity(numeric(e.target.value)), setError(null))} />
        </Field>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <Button block loading={busy} onClick={add}>
          Add item
        </Button>
      </div>
    </Sheet>
  );
}

/** Goods items as a table: item, weight, quantity. [onRemove] shows a remove button per row. */
export function GoodsTable({ goods, onRemove, busy }: { goods: (NewGoodsItem & { id?: string })[]; onRemove?: (index: number) => void; busy?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-50/70 text-xs font-semibold text-muted">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Weight</th>
            <th className="px-3 py-2 text-right">Quantity</th>
            {onRemove && <th className="w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {goods.map((g, i) => (
            <tr key={g.id ?? i}>
              <td className="break-words px-3 py-2.5 font-semibold text-ink">{g.item}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{goodsWeight(g)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{goodsQuantity(g)}</td>
              {onRemove && (
                <td className="pr-2">
                  <button
                    type="button"
                    aria-label={`Remove ${g.item}`}
                    disabled={busy}
                    onClick={() => onRemove(i)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Goods description and the goods list (item, weight, quantity). */
export function GoodsCard({ trip, editable }: { trip: Trip; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (goods: NewGoodsItem[]) => {
    setBusy(true);
    try {
      await api(`/api/trips/${trip.id}/goods`, { body: { goods: toBody(goods) } });
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle
        action={
          editable && (
            <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Add item
            </Button>
          )
        }
      >
        Goods
      </SectionTitle>

      {trip.goodsDescription && <p className="mb-3 rounded-2xl bg-brand-50/70 p-3 text-sm text-ink">{trip.goodsDescription}</p>}

      {trip.goods.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted">
          <Package className="h-4 w-4" /> No goods items added yet
        </p>
      ) : (
        <GoodsTable goods={trip.goods} busy={busy} onRemove={editable ? (i) => save(trip.goods.filter((_, j) => j !== i)) : undefined} />
      )}

      <AddGoodsSheet
        open={open}
        onClose={() => setOpen(false)}
        onAdd={async (item) => {
          const ok = await save([...trip.goods, item]);
          if (ok) toast.success("Item added");
          return ok;
        }}
      />
    </Card>
  );
}
