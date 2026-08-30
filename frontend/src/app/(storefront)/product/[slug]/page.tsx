import type { Metadata } from "next";
import ProductDetail from "@/views/ProductDetail";
import { JsonLd } from "@/components/JsonLd";
import { safeQuery, serverApi } from "@/lib/api/server";
import { productJsonLd } from "@/lib/seo/jsonLd";
import { SITE } from "@/lib/seo/site";

type Params = { params: Promise<{ slug: string }> };

// Fetched on the server so the title, description and OG tags Google reads are
// the real product's — not a generic shell.
async function getProduct(slug: string) {
  return safeQuery(() => serverApi.commerce.getProductBySlug.query({ slug }), null);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Piece not found", robots: { index: false, follow: true } };
  }

  const description =
    product.description?.slice(0, 300) ??
    `${product.name} — handcrafted by ${SITE.name} in Toronto, made to order.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ${SITE.name}`,
      description,
      url: `${SITE.url}/product/${product.slug}`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return (
    <>
      {product ? <JsonLd data={productJsonLd(product)} /> : null}
      <ProductDetail />
    </>
  );
}
