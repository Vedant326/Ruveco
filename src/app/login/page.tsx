"use client";

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from "firebase/auth";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TruckScene } from "@/components/brand/illustrations";
import { Logo } from "@/components/brand/logo";
import { Gate } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { PHONE_RE } from "@/lib/constants";
import { fb, usingEmulators } from "@/lib/firebase/client";
import { fmtPhone } from "@/lib/format";

const RESEND_SECONDS = 30;

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-phone-number": "Enter a valid 10-digit mobile number",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/invalid-verification-code": "Wrong OTP. Check the code and try again.",
  "auth/code-expired": "This OTP has expired. Tap Resend to get a new one.",
  "auth/billing-not-enabled": "SMS login needs the Firebase Blaze plan. Use a test number or Google sign-in for now.",
  "auth/operation-not-allowed": "This sign-in method is not turned on in Firebase yet.",
  "auth/network-request-failed": "No internet connection. Please try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/unauthorized-domain": "This website address is not allowed in Firebase Authentication settings.",
};

function authError(err: unknown) {
  if (err instanceof FirebaseError) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return null;
    return AUTH_ERRORS[err.code] ?? "Could not sign in. Please try again.";
  }
  return "Could not sign in. Please try again.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginForm() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"otp" | "verify" | "google" | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  const phoneValid = PHONE_RE.test(phone);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => () => verifier.current?.clear(), []);

  const sendOtp = async () => {
    if (!phoneValid) return setError("Enter a valid 10-digit mobile number");
    setError(null);
    setBusy("otp");
    try {
      const { auth } = fb();
      // A fresh invisible reCAPTCHA is needed for every SMS request.
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      confirmation.current = await signInWithPhoneNumber(auth, `+91${phone}`, verifier.current);
      setOtp("");
      setStep("otp");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(null);
    }
  };

  const verify = async (code: string) => {
    if (code.length !== 6 || !confirmation.current) return;
    setError(null);
    setBusy("verify");
    try {
      // On success the auth listener takes over and moves the user on.
      await confirmation.current.confirm(code);
    } catch (err) {
      setError(authError(err));
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithPopup(fb().auth, new GoogleAuthProvider());
    } catch (err) {
      setError(authError(err));
      setBusy(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === "phone") void sendOtp();
    else void verify(otp);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      {/* Brand panel: top on phones, left on desktop */}
      <div className="brand-gradient relative flex shrink-0 flex-col overflow-hidden px-6 pt-6 text-white md:w-[46%] md:justify-between md:p-10">
        <Link href="/" aria-label="Ruveco home">
          <Logo tone="light" />
        </Link>
        <div className="hidden md:block">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Every trip,
            <br />
            <span className="text-brand-300">tracked live.</span>
          </h2>
          <p className="mt-3 max-w-sm text-white/80">Create trips, assign drivers and share one tracking link with your customer.</p>
        </div>
        <TruckScene className="-mx-6 mt-2 h-44 md:-mx-10 md:-mb-10 md:h-80" />
      </div>

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-[32px] bg-white px-6 pb-8 pt-8 md:mt-0 md:items-center md:justify-center md:rounded-none md:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
          <AnimatePresence mode="wait" initial={false}>
            {step === "phone" ? (
              <motion.div key="phone" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h1 className="text-3xl font-extrabold tracking-tight text-ink">Get started</h1>
                <p className="mt-1.5 text-sm text-muted">Enter your mobile number. We will send you a 6-digit OTP.</p>

                <Field label="Phone number" required error={error} className="mt-7">
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
                      }}
                    />
                  </span>
                </Field>

                <Button type="submit" block size="lg" className="mt-5" disabled={!phoneValid || busy === "google"} loading={busy === "otp"}>
                  Send OTP
                </Button>

                <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>

                <Button variant="outline" block size="lg" icon={<GoogleIcon />} loading={busy === "google"} disabled={busy === "otp"} onClick={google}>
                  Continue with Google
                </Button>

                {usingEmulators && (
                  <p className="mt-5 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
                    Local mode: any number works. The OTP is printed in the terminal running the Firebase emulators.
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                  className="mb-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Change number
                </button>
                <h1 className="text-3xl font-extrabold tracking-tight text-ink">Verify OTP</h1>
                <p className="mt-1.5 text-sm text-muted">
                  Enter the 6-digit code sent to <span className="font-semibold text-ink">{fmtPhone(phone)}</span>
                </p>

                <div className="mt-7">
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

                <Button type="submit" block size="lg" className="mt-5" disabled={otp.length !== 6} loading={busy === "verify"}>
                  Verify
                </Button>

                <p className="mt-5 text-center text-sm text-muted">
                  {resendIn > 0 ? (
                    <>Resend OTP in {resendIn}s</>
                  ) : (
                    <button type="button" onClick={sendOtp} disabled={busy !== null} className="cursor-pointer font-semibold text-brand-700 disabled:opacity-50">
                      Resend OTP
                    </button>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5" /> Your number is only used to sign you in.
          </p>
        </form>
        <div id="recaptcha-container" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Gate area="guest">
      <LoginForm />
    </Gate>
  );
}
