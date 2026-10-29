import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { buildTrackResponse } from "@/lib/server/track";

type Ctx = { params: Promise<{ token: string }> };

const invalid = () => NextResponse.json({ valid: false }, { status: 404 });

/**
 * Public tracking data. No login: the unguessable token is the only key.
 * Returns status, ETA and map data; the first (full) request also gets the driver's name and phone,
 * the vehicle number and the goods, so the receiver knows who is coming and what to expect.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const full = req.nextUrl.searchParams.get("full") === "1";
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return invalid();

  try {
    const body = await buildTrackResponse(token, full);
    if (!body) return invalid();
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    unstable_rethrow(err);
    console.error("[api] track", err);
    return NextResponse.json({ error: "Tracking is not available right now." }, { status: 500 });
  }
}
