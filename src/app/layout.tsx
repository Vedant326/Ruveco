import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Ruveco · Live trip tracking", template: "%s · Ruveco" },
  description: "Create trips, assign drivers and track every vehicle live. Share one link with the receiver.",
  applicationName: "Ruveco",
};

export const viewport: Viewport = {
  themeColor: "#4f0bb8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: 16, border: "1px solid #ebe7f5", fontFamily: "inherit" },
          }}
        />
      </body>
    </html>
  );
}
