import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Plain, readable layout for the privacy policy and the account deletion page. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Ruveco home">
            <Logo size="sm" />
          </Link>
          <Link href="/#contact" className="text-sm font-semibold text-muted hover:text-brand-700">
            Contact
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>
        {intro && <div className="mt-6 text-base leading-relaxed text-ink">{intro}</div>}
        <div className="mt-8 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted">
          <Logo size="sm" />
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-700">
              Privacy policy
            </Link>
            <Link href="/delete-account" className="hover:text-brand-700">
              Delete account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/85 [&_a]:font-semibold [&_a]:text-brand-700 [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
