import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GOODS_UNITS, WEIGHT_UNITS } from "@/lib/constants";
import type { GoodsItem } from "@/lib/types";

/**
 * One goods item: name, weight with its unit (kg, ton, quintal, gram, litre, pieces, boxes or bags),
 * and an optional quantity.
 * Items saved before weights existed have one amount with its unit (kg, ton, pieces or boxes);
 * they are still accepted, because the whole list is sent back when an item is added or removed.
 */
const goodsItem = z
  .object({
    item: z.string().trim().min(1, "Enter the item name").max(80),
    weight: z.number().positive("Weight must be more than 0").max(1_000_000).nullable().default(null),
    weightUnit: z.enum(WEIGHT_UNITS).nullable().default(null),
    quantity: z.number().positive("Quantity must be more than 0").max(1_000_000).nullable().default(null),
    unit: z.enum(GOODS_UNITS).nullable().default(null),
  })
  .refine((g) => g.weight !== null || g.quantity !== null, "Enter the weight")
  .refine((g) => g.weight === null || g.weightUnit !== null, "Choose a unit");

export const goodsList = z.array(goodsItem).max(50, "A trip can have up to 50 goods items");

/** The list as saved on the trip, each item with its own ID. */
export function toStoredGoods(goods: z.infer<typeof goodsList>): GoodsItem[] {
  return goods.map((g) => ({
    id: randomUUID(),
    item: g.item,
    weight: g.weight,
    weightUnit: g.weight === null ? null : g.weightUnit,
    quantity: g.quantity,
    unit: g.unit,
  }));
}
