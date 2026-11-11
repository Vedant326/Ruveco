import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink } from "@/components/contact-link";
import { LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What data the Ruveco website and app collect, why, who can see it, and how to delete it.",
};

const EMAIL = "vedant.pawar@ruveco.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="11 November 2026"
      intro={
        <p>
          Ruveco helps transport companies create trips, assign drivers and track deliveries live. This policy explains what
          information the Ruveco website (www.ruveco.com) and the Ruveco Android and iOS apps collect, why we need it, who can
          see it, and how you can have it deleted. In this policy, &ldquo;Ruveco&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean the
          team that runs the service.
        </p>
      }
    >
      <Section title="1. Information we collect">
        <p>
          <strong>Account details.</strong> Your phone number (when you sign in with an OTP) or your Google account email, your
          name, whether you are an owner or a driver, and your company name. Owners may also add a business address.
        </p>
        <p>
          <strong>Driver verification.</strong> Drivers give their driving license number, a photo of their license and a face
          photo taken in the app. We keep these to verify drivers and to help resolve disputes about who drove a vehicle. They
          are stored privately and are not shown to owners or receivers.
        </p>
        <p>
          <strong>Precise location.</strong> When a driver starts a trip, the app records the phone&rsquo;s GPS location about
          every 15 seconds until the trip is completed or cancelled. This continues while the app is in the background or the
          screen is off, and Android shows a notification for as long as tracking is on. Location is not collected when no trip
          is running. The app also saves the location when a driver adds a fuel entry, if the phone can provide it.
        </p>
        <p>
          <strong>Trip details.</strong> Pickup and drop addresses, dates and times, the vehicle, the receiver&rsquo;s name and
          phone number, the goods list, documents such as e-way bills and GST invoices, fuel entries with bill photos, payment
          amounts entered by the owner, and ratings and comments given after a trip.
        </p>
        <p>
          <strong>Vehicle details.</strong> Vehicle number, type and make, and documents owners upload, such as RC, insurance,
          PUC, permit and fitness certificates.
        </p>
        <p>
          <strong>Photos and files.</strong> The app uses the camera and your photos or files only when you choose to take a
          photo or upload a document. We store only the photos and files you upload.
        </p>
        <p>
          <strong>Device information.</strong> An app installation ID and a push notification token, so we can send trip
          updates to your phone, and the phone&rsquo;s platform (Android or iOS).
        </p>
        <p>We do not show ads, and we do not use advertising or analytics trackers.</p>
      </Section>

      <Section title="2. How we use it">
        <ul>
          <li>To sign you in and keep your account secure.</li>
          <li>To link drivers to the company they work for and let owners manage vehicles and trips.</li>
          <li>To show the vehicle&rsquo;s live position, route and estimated arrival to the owner and the receiver.</li>
          <li>To send notifications about trips, such as when a trip is assigned, started or completed.</li>
          <li>To keep trip records such as documents, fuel and payments for the owner&rsquo;s business.</li>
          <li>To prevent misuse of the service and to fix problems.</li>
        </ul>
      </Section>

      <Section title="3. Who can see your information">
        <ul>
          <li>
            <strong>The owner of your company</strong> can see their drivers&rsquo; names and phone numbers, their vehicles, and
            all of the company&rsquo;s trips, including the live and past locations of those trips.
          </li>
          <li>
            <strong>Drivers</strong> can see the trips assigned to them and the trip&rsquo;s documents.
          </li>
          <li>
            <strong>People with a tracking link.</strong> When an owner shares a trip&rsquo;s tracking link, anyone with that link
            can see the company name, the driver&rsquo;s name and phone number, the vehicle number and type, the goods, the pickup
            and drop points, and the vehicle&rsquo;s live location while the trip is running. A <em>private</em> tracking link only
            opens for the phone numbers the owner adds, after an OTP check.
          </li>
          <li>
            <strong>Service providers</strong> that run parts of Ruveco for us: Google Firebase (sign-in, database, file storage
            and notifications) and our hosting provider. To search addresses and draw routes, we send addresses or map coordinates,
            not your name or phone number, to OpenStreetMap-based services (Photon, OSRM and openrouteservice).
          </li>
          <li>
            <strong>Authorities</strong>, if the law requires us to share information.
          </li>
        </ul>
        <p>We do not sell your personal information or share it with advertisers.</p>
      </Section>

      <Section title="4. How we protect it">
        <p>
          All data is sent over encrypted connections (HTTPS). Data is stored in Google Firebase, and access rules let each person
          see only their own account and the trips of their own company. Uploaded documents and photos can only be opened by
          signed-in users who are allowed to see them.
        </p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your information while your account is active. When you delete your account, we delete your profile, your
          verification photos and your devices within 30 days, as described on the{" "}
          <Link href="/delete-account">account deletion page</Link>. Trip records that a company needs for its business accounts
          may be kept by that company, and records may stay longer where the law requires it.
        </p>
      </Section>

      <Section title="6. Your choices">
        <ul>
          <li>You can view and update your profile in the app.</li>
          <li>
            You can turn off location access in your phone&rsquo;s settings at any time. Drivers need location on while a trip is
            running, because that is how the trip is tracked.
          </li>
          <li>You can turn off notifications in your phone&rsquo;s settings.</li>
          <li>
            You can ask us for a copy of your data, ask us to correct it, or{" "}
            <Link href="/delete-account">delete your account and data</Link>.
          </li>
        </ul>
      </Section>

      <Section title="7. Children">
        <p>Ruveco is a business tool for transport companies and their drivers. It is not meant for anyone under 18.</p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          If we change this policy, we will update the date at the top of this page. For important changes, we will also tell you
          in the app.
        </p>
      </Section>

      <Section title="9. Contact us">
        <p>
          For any question about your privacy or this policy, email{" "}
          <ContactLink href={`mailto:${EMAIL}`}>{EMAIL}</ContactLink> or call{" "}
          <a href="tel:+918983153694">+91 89831 53694</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
