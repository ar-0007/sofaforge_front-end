import type { Metadata } from "next";
import Home from "@/views/Home";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/seo/jsonLd";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Home />
    </>
  );
}
