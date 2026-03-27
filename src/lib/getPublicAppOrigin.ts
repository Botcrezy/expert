/**
 * Returns the origin to use in payment links/redirects.
 *
 * Requirement: be flexible with the deployed domain (no forced redirect domain).
 *
 * NOTE: If your payment provider requires whitelisting domains, make sure the
 * deployed domain is whitelisted there.
 */
export function getPublicAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
