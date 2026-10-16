import { z } from "zod";
import { handle, requireSession } from "@/lib/server/http";
import { getRoute } from "@/lib/server/routing";

const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const schema = z.object({ from: point, to: point });

// Distance preview for the Create Trip form.
export const POST = handle(async (req) => {
  await requireSession(req);
  const { from, to } = schema.parse(await req.json());
  const route = await getRoute(from, to);
  return {
    distanceKm: Math.round(route.distanceKm * 10) / 10,
    durationMin: Math.round(route.durationSec / 60),
  };
});
