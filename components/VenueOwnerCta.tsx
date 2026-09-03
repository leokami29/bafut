"use client";

import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Thin client wrapper around an <a> tag that fires a GA4 event on click.
 * Used inside the server-rendered VenueOwnerBlock.
 */
export function VenueOwnerCta({
  method,
  ...props
}: ComponentProps<"a"> & { method: "whatsapp" | "email" }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackEvent("venue_owner_contact_clicked", { method });
        // Don't prevent default — let the link navigate normally.
        props.onClick?.(e);
      }}
    />
  );
}
