import type { NextRequest } from "next/server";
import { z } from "zod";
import { PHONE_RE } from "@/lib/constants";
import { ApiError, handle } from "@/lib/server/http";
import { mayView, tripByPrivateToken } from "@/lib/server/private-link";

type Ctx = { params: Promise<{ token: string }> };

const schema = z.object({ phone: z.string().regex(PHONE_RE, "Enter a valid 10-digit mobile number") });

/**
 * Before an OTP is sent for a private tracking link: is this number on the owner's list?
 * The OTP is only sent when it is, so people not on the list never get one.
 */
export const POST = handle(async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const trip = await tripByPrivateToken(token);
  if (!trip) throw new ApiError(404, "This link is not valid.");
  const { phone } = schema.parse(await req.json());
  if (!mayView(trip, phone)) throw new ApiError(403, "You don't have access to this link.");
  return { allowed: true };
});
