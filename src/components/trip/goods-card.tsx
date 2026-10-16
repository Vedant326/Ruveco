"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { GOODS_UNITS } from "@/lib/constants";
import type { Trip } from "@/lib/types";

/** Goods description and the goods list (item, quantity, unit). */
export function GoodsCard({ trip, editable }: { trip: Trip; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<(typeof GOODS_UNITS)[number]>("kg");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (goods: { item: string; quantity: number; unit: string }[], key: string) => {
    setBusy(key);
    try {
      await api(`/api/trips/${trip.id}/goods`, { body: { goods } });
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    const qty = Number(quantity);
    if (!item.trim()) return setError("Enter the item name");
    if (!(qty > 0)) return setError("Enter a quantity more than 0");
    setError(null);
    if (await save([...trip.goods, { item: item.trim(), quantity: qty, unit }], "add")) {
      setItem("");
      setQuantity("");
      setOpen(false);
      toast.success("Item added");
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
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50/70 text-xs font-semibold text-muted">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2">Unit</th>
                {editable && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {trip.goods.map((g) => (
                <tr key={g.id}>
                  <td className="break-words px-3 py-2.5 font-semibold text-ink">{g.item}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{g.quantity}</td>
                  <td className="px-3 py-2.5 text-muted">{g.unit}</td>
                  {editable && (
                    <td className="pr-2">
                      <button
                        type="button"
                        aria-label={`Remove ${g.item}`}
                        disabled={busy !== null}
                        onClick={() =>
                          save(
                            trip.goods.filter((x) => x.id !== g.id),
                            g.id,
                          )
                        }
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
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add goods item">
        <div className="space-y-4">
          <Field label="Item name" required>
            <Input value={item} maxLength={80} placeholder="Cement bags" onChange={(e) => setItem(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required>
              <Input value={quantity} inputMode="decimal" placeholder="100" onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
            <Field label="Unit" required>
              <Select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>
                {GOODS_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </Field>
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <Button block loading={busy === "add"} onClick={add}>
            Add item
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
