"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * A contact link. Email links stay `mailto:` (phones open their mail app, usually Gmail),
 * but on laptops, where `mailto:` often opens nothing or an unused mail app, a click opens a
 * Gmail draft in a new tab instead.
 */
export function ContactLink({
  href,
  external = false,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("mailto:") || !window.matchMedia("(pointer: fine)").matches) return;
    e.preventDefault();
    const to = encodeURIComponent(href.slice("mailto:".length));
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}`, "_blank", "noopener,noreferrer");
  };

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
