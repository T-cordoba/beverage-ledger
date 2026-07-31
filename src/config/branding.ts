/**
 * Product-level branding, for the surfaces that run before there is a session:
 * the landing, the auth screens and the document title. Once signed in the
 * organization takes over — its name is what a tenant expects to read, and it
 * is what the API prints on the PDF.
 *
 * Overridable by env so a deployment can be rebranded without a code change.
 */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Beverage Ledger',
  logoSrc: '/bl-logo.png',
} as const;
