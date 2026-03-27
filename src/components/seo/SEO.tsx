import { forwardRef } from "react";
import { Helmet } from "react-helmet-async";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";

type SEOProps = {
  title: string;
  description?: string;
  /** Path starting with / (e.g. "/pricing") */
  path: string;
  ogImage?: string;
  /** schema.org @type */
  schemaType?: string;
  /** Extra JSON-LD payload merged into base */
  schema?: Record<string, unknown>;
};

function toCanonicalUrl(origin: string, path: string) {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  // Avoid double slashes when path is "/"
  if (safePath === "/") return `${origin}/`;
  return `${origin}${safePath}`;
}

export const SEO = forwardRef<unknown, SEOProps>(function SEO(
  { title, description, path, ogImage, schemaType = "WebPage", schema }: SEOProps,
  _ref
) {
  const origin = getPublicAppOrigin();
  const canonicalUrl = toCanonicalUrl(origin, path);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
    url: canonicalUrl,
    name: title,
    ...(description ? { description } : {}),
    ...(schema || {}),
  };

  return (
    <Helmet>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
});
