import { ArrowRight, Link2, MapPin, Radio, Route, ShieldCheck, Smartphone, Truck } from "lucide-react";
import Link from "next/link";
import { TruckArt, TruckScene } from "@/components/brand/illustrations";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button-class";
import { FadeIn } from "@/components/ui/motion";
import { cx } from "@/lib/format";

const FEATURES = [
  { icon: Route, title: "Create a trip in a minute", text: "Pick the vehicle, the driver, and the pickup and drop points from the map." },
  { icon: Radio, title: "Live GPS, every 15 seconds", text: "The driver taps Start trip and the truck appears on your map right away." },
  { icon: Link2, title: "One link for the receiver", text: "Share it on WhatsApp. No app and no login, just status, ETA and the map." },
];

const STEPS = [
  { who: "Owner", icon: Truck, text: "Adds vehicles, creates the trip and assigns a driver." },
  { who: "Driver", icon: Smartphone, text: "Starts the trip on their phone. Location is shared until it ends." },
  { who: "Receiver", icon: MapPin, text: "Opens the link and watches the delivery arrive." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      <section className="brand-gradient relative overflow-hidden text-white">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
          <Logo tone="light" />
          <Link href="/login" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
            Sign in
          </Link>
        </header>

        <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 pt-6 md:grid-cols-2 md:items-end md:gap-10 md:pt-12">
          {/* Bottom padding on desktop keeps the buttons clear of the hero edge; the truck sits on it. */}
          <FadeIn className="md:pb-24">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live trip tracking for transport
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Every trip,
              <br />
              <span className="text-brand-300">tracked live.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">
              Create trips, assign drivers and see every vehicle on the map. Share one link so your customer always knows
              when the delivery arrives.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonClass("white", "lg")}>
                Get started <ArrowRight className="h-5 w-5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 text-sm text-white/75">
                <ShieldCheck className="h-4 w-4" /> Phone OTP or Google sign-in
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <TruckScene className="-mx-5 h-60 sm:h-72 md:mx-0 md:h-96" />
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={0.1 * i}>
              <div className="h-full rounded-3xl border border-line bg-white p-6 shadow-card">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <feature.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-ink">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">One trip, three people</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.who} className="relative overflow-hidden rounded-3xl border border-line/70 bg-white p-6 shadow-card">
                <span aria-hidden className="absolute right-5 top-4 text-6xl font-extrabold leading-none text-brand-100">
                  {i + 1}
                </span>
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-brand-700 text-white">
                  <step.icon className="h-5 w-5" />
                </span>
                <h3 className="relative mt-4 font-bold text-ink">{step.who}</h3>
                <p className="relative mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="brand-gradient mt-10 flex flex-col items-center gap-6 overflow-hidden rounded-4xl p-7 text-center text-white sm:flex-row sm:p-10 sm:text-left">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">Ready for your first trip?</h2>
              <p className="mt-1.5 text-sm text-white/80">Sign up with your phone number. It takes less than a minute.</p>
              <Link href="/login" className={cx(buttonClass("white", "md"), "mt-5")}>
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <TruckArt type="MCV" tone="brand" className="w-56 shrink-0 sm:w-64" />
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 text-xs text-muted">
        <Logo size="sm" />
        <span>Live trip tracking for transport</span>
      </footer>
    </div>
  );
}
