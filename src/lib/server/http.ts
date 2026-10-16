import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Role, UserProfile } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps a route handler so thrown errors become JSON responses. */
export function handle<C>(fn: (req: NextRequest, ctx: C) => Promise<unknown>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      const data = await fn(req, ctx);
      return NextResponse.json(data ?? { ok: true });
    } catch (err) {
      // Let Next.js handle its own control-flow errors (for example the prerender bail-out).
      unstable_rethrow(err);
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        return NextResponse.json({ error: issue?.message ?? "Invalid request" }, { status: 400 });
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export interface Session {
  uid: string;
  phone: string | null;
  email: string | null;
  name: string | null;
}

/** Verifies the Firebase ID token sent in the Authorization header. */
export async function requireSession(req: NextRequest): Promise<Session> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError(401, "Please sign in again.");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      phone: decoded.phone_number ? decoded.phone_number.replace(/^\+91/, "") : null,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    throw new ApiError(401, "Please sign in again.");
  }
}

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb().doc(`users/${uid}`).get();
  return snap.exists ? ({ ...snap.data(), uid } as UserProfile) : null;
}

/** Session plus the stored profile, checked against the required role. */
export async function requireRole(req: NextRequest, role: Role) {
  const session = await requireSession(req);
  const profile = await loadProfile(session.uid);
  if (!profile || profile.role !== role) {
    throw new ApiError(403, role === "owner" ? "Only owners can do this." : "Only drivers can do this.");
  }
  return { session, profile };
}
