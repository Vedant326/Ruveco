import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink } from "@/components/contact-link";
import { LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your Ruveco account and the data linked to it.",
};

const EMAIL = "vedant.pawar@ruveco.com";

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your Ruveco account"
      updated="11 November 2026"
      intro={
        <p>
          This page explains how to delete your account in the <strong>Ruveco</strong> app (Android and iOS) and on
          www.ruveco.com, and what happens to your data. Ruveco is run by the Ruveco team.
        </p>
      }
    >
      <Section title="How to request deletion">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Send an email to <ContactLink href={`mailto:${EMAIL}`}>{EMAIL}</ContactLink> with the subject{" "}
            <strong>&ldquo;Delete my Ruveco account&rdquo;</strong>.
          </li>
          <li>
            In the email, write the <strong>phone number or Google email you use to sign in</strong>, and whether you are an
            owner or a driver. If you can, send it from that same email address.
          </li>
          <li>
            To make sure nobody else deletes your account, we may call or message the phone number on the account to confirm the
            request.
          </li>
        </ol>
        <p>
          You can also call us at <a href="tel:+918983153694">+91 89831 53694</a>. We confirm the request within 7 days and
          finish deleting your data within 30 days.
        </p>
      </Section>

      <Section title="What we delete">
        <ul>
          <li>Your profile: name, phone number, email, role, company link and address.</li>
          <li>Your sign-in account, so the phone number or Google account can no longer sign in to it.</li>
          <li>For drivers: your driving license number, license photo and face photo.</li>
          <li>The location history recorded on your phone during trips.</li>
          <li>Your notifications and the devices registered for push notifications.</li>
          <li>
            For owners: your company, vehicles and vehicle documents, and your trips with their documents, fuel bills and
            tracking links. Your drivers&rsquo; accounts are not deleted, but they are no longer linked to your company.
          </li>
        </ul>
      </Section>

      <Section title="What we keep, and for how long">
        <ul>
          <li>
            For drivers: trips you drove for a company stay in that company&rsquo;s records, because the owner needs them for their
            business accounts. Your name and phone number on those trips stay with the trip, but your verification photos and
            profile are deleted.
          </li>
          <li>Information we must keep by law, only for as long as the law requires.</li>
          <li>Copies in our backups, which are removed automatically within 30 days.</li>
        </ul>
      </Section>

      <Section title="Delete some data without deleting your account">
        <p>
          You can ask us to delete specific data, such as your license and face photos or an uploaded document, while keeping
          your account. Email <ContactLink href={`mailto:${EMAIL}`}>{EMAIL}</ContactLink> and tell us what you want removed.
        </p>
      </Section>

      <p className="text-sm text-muted">
        Read our <Link href="/privacy" className="font-semibold text-brand-700 hover:underline">privacy policy</Link> to see all
        the data Ruveco collects and how it is used.
      </p>
    </LegalPage>
  );
}
