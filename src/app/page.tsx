import { ArrowRight, ArrowUpRight, Link2, Mail, MapPin, Phone, Radio, Route, ShieldCheck, Smartphone, Truck } from "lucide-react";
import Link from "next/link";
import type { SVGProps } from "react";
import { TruckArt, TruckScene } from "@/components/brand/illustrations";
import { Logo } from "@/components/brand/logo";
import { ContactLink } from "@/components/contact-link";
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

/** LinkedIn logo (lucide has no brand icons). */
function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const CONTACTS = [
  { icon: LinkedInIcon, label: "LinkedIn", value: "ruveco", href: "https://www.linkedin.com/company/ruveco/posts/", external: true },
  { icon: Mail, label: "Email", value: "vedant.pawar@ruveco.com", href: "mailto:vedant.pawar@ruveco.com", external: false },
  { icon: Phone, label: "Phone", value: "+91 89831 53694", href: "tel:+918983153694", external: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      <section className="brand-gradient relative overflow-hidden text-white">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
          <Logo tone="light" />
          <div className="flex items-center gap-1">
            <a href="#contact" className="rounded-full px-4 py-2 text-sm font-semibold text-white/85 hover:text-white">
              Contact
            </a>
            <Link href="/login" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
              Sign in
            </Link>
          </div>
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

      <section id="contact" className="mx-auto w-full max-w-5xl scroll-mt-6 px-5 py-12 sm:py-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Contact us</h2>
        <p className="mt-1.5 text-sm text-muted">Questions, a demo or onboarding your fleet. We usually reply the same day.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CONTACTS.map((c, i) => (
            <FadeIn key={c.label} delay={0.08 * i}>
              <ContactLink
                href={c.href}
                external={c.external}
                className="group flex h-full items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-card transition-colors hover:border-brand-300"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <c.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</span>
                  <span className="block truncate font-bold text-ink">{c.value}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </ContactLink>
            </FadeIn>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 text-xs text-muted">
        <Logo size="sm" />
        <span>Live trip tracking for transport</span>
      </footer>
    </div>
  );
}
