"use client";

import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, signOut, type ConfirmationResult, type User } from "firebase/auth";
import { ArrowLeft, LockKeyhole, ShieldX } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FullLoader } from "@/components/ui/misc";
import { OtpInput } from "@/components/ui/otp-input";
import { authError } from "@/lib/auth-errors";
import { PHONE_RE } from "@/lib/constants";
import { viewerAuth } from "@/lib/firebase/client";
import { fmtPhone } from "@/lib/format";
import { TrackingView } from "../../t/[token]/tracking-view";

const RESEND_SECONDS = 30;

/**
 * Private tracking link: shows the tracking page only to phone numbers on the owner's list, after
 * an OTP. Until then a box that cannot be closed asks for the number. The OTP is only sent to a
 * number on the list. Uses its own sign-in, so a Ruveco account on this browser stays signed in.
 */
export function PrivateTrackingView() {
  const { token } = useParams<{ token: string }>();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [denied, setDenied] = useState(false);

  useEffect(() => onAuthStateChanged(viewerAuth(), (u) => setUser(u)), []);

  const authToken = useCallback(async () => (await viewerAuth().currentUser?.getIdToken()) ?? null, []);
  // Not (or no longer) on the list: sign this viewer out and ask again.
  const onDenied = useCallback(() => {
    setDenied(true);
    void signOut(viewerAuth());
  }, []);

  if (user === undefined) return <FullLoader />;
  if (!user || denied) return <VerifyGate token={token} removed={denied} onVerified={() => setDenied(false)} />;
  return <TrackingView endpoint={`/api/ptrack/${token}`} authToken={authToken} onDenied={onDenied} />;
}

/** The verification box: phone number, then OTP. It has no close button and covers the page. */
function VerifyGate({ token, removed, onVerified }: { token: string; removed: boolean; onVerified: () => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(removed ? "You don't have access to this link." : null);
  const [noAccess, setNoAccess] = useState(removed);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => () => verifier.current?.clear(), []);

  const sendOtp = async () => {
    if (!PHONE_RE.test(phone)) return setError("Enter a valid 10-digit mobile number");
    setError(null);
    setNoAccess(false);
    setBusy(true);
    try {
      // The OTP is only sent to a number the owner added to this link.
      const res = await fetch(`/api/ptrack/${token}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.status === 403) {
        setNoAccess(true);
        setError("You don't have access to this link.");
        return;
      }
      if (res.status === 404) return setError("This link is not valid. Ask the sender for a new one.");
      if (!res.ok) return setError("Something went wrong. Please try again.");

      const auth = viewerAuth();
      // A fresh invisible reCAPTCHA is needed for every SMS request.
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "private-recaptcha", { size: "invisible" });
      confirmation.current = await signInWithPhoneNumber(auth, `+91${phone}`, verifier.current);
      setOtp("");
      setStep("otp");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(authError(err) ?? "Could not send the OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (code.length !== 6 || !confirmation.current) return;
    setError(null);
    setBusy(true);
    try {
      // On success the sign-in listener shows the tracking page.
      await confirmation.current.confirm(code);
      onVerified();
    } catch (err) {
      setError(authError(err));
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === "phone") void sendOtp();
    else void verify(otp);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-white p-4" role="dialog" aria-modal="true" aria-labelledby="private-title">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-sm rounded-3xl border border-line bg-white p-6 shadow-float sm:p-7">
        <div className="flex justify-center">
          <Logo />
        </div>
        <span className={`mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full ${noAccess ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"}`}>
          {noAccess ? <ShieldX className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
        </span>

        {step === "phone" ? (
          <>
            <h1 id="private-title" className="mt-4 text-center text-xl font-extrabold text-ink">
              {noAccess ? "You don't have access to this link" : "Verify to view this delivery"}
            </h1>
            <p className="mt-1.5 text-center text-sm text-muted">
              {noAccess
                ? "This private link was shared with specific phone numbers only. Try another number, or ask the sender to add yours."
                : "This private link was shared with specific phone numbers. Enter yours and we will send you an OTP."}
            </p>
            <Field label="Phone number" required error={error} className="mt-6">
              <span className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2 border-r border-line pr-3 text-[15px] font-semibold text-ink">
                  🇮🇳 +91
                </span>
                <Input
                  value={phone}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="98765 43210"
                  invalid={Boolean(error)}
                  className="pl-[5.6rem] text-lg font-semibold tracking-wide"
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError(null);
                    setNoAccess(false);
                  }}
                />
              </span>
            </Field>
            <Button type="submit" block size="lg" className="mt-5" disabled={!PHONE_RE.test(phone)} loading={busy}>
              Send OTP
            </Button>
          </>
        ) : (
          <>
            <h1 id="private-title" className="mt-4 text-center text-xl font-extrabold text-ink">
              Enter the OTP
            </h1>
            <p className="mt-1.5 text-center text-sm text-muted">
              Sent to <span className="font-bold text-ink">{fmtPhone(phone)}</span>
            </p>
            <div className="mt-6">
              <OtpInput
                value={otp}
                invalid={Boolean(error)}
                onChange={(value) => {
                  setOtp(value);
                  setError(null);
                  if (value.length === 6) void verify(value);
                }}
              />
              {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
            </div>
            <Button type="submit" block size="lg" className="mt-5" disabled={otp.length !== 6} loading={busy}>
              Verify
            </Button>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-700"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Change number
              </button>
              {resendIn > 0 ? (
                <span className="text-muted">Resend in {resendIn}s</span>
              ) : (
                <button type="button" disabled={busy} className="cursor-pointer font-semibold text-brand-700 disabled:opacity-50" onClick={() => void sendOtp()}>
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}
        <div id="private-recaptcha" />
      </form>
    </div>
  );
}
