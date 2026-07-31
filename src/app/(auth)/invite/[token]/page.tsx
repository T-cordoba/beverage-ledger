import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AcceptInviteForm } from '@/features/invitations';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invite');
  return { title: t('metaTitle') };
}

/**
 * The token rides in the path because that is what makes a link a link. It never
 * leaves the browser that way: the form posts it in a request body, so it stays
 * out of the API's access logs and out of any Referer header.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInviteForm token={token} />;
}
