import type { Metadata } from "next";
import Home2 from "@/views/Home2";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/seo/jsonLd";
import { SITE } from "@/lib/seo/site";

/**
 * The second home page draft, parked on its own URL so it can be reviewed
 * beside the live one. `noindex` because two home pages competing for the same
 * queries is how a site loses both of them; drop the robots block if this one
 * is promoted to `/`.
 */
export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function Home2Page() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Home2 />
    </>
  );
}
