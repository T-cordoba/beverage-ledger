'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, Card, FloatingAction } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import type { MovementType } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPE_ORDER, MOVEMENT_TYPES } from './movement-types';

function Glyph({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/**
 * A glyph per type, because four buttons that differ by one word take a read to
 * tell apart. Direction is the whole distinction between them, so the icons draw
 * it: out of the box, into the box, across, and neither.
 */
const TYPE_ICONS: Record<MovementType, ReactNode> = {
  OUTBOUND: (
    <Glyph d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
  ),
  INBOUND: (
    <Glyph d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
  ),
  TRANSFER: (
    <Glyph d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  ),
  ADJUSTMENT: (
    <Glyph d="M10.5 6h9.75M3.75 6H7.5m3 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16.5 12h3.75M3.75 12h9.75m3 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM10.5 18h9.75M3.75 18H7.5m3 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  ),
};

/** The types this session may record, in the order the product puts them. */
function useAllowedTypes(): MovementType[] {
  const { can } = useAuth();
  return MOVEMENT_TYPE_ORDER.filter((type) => can(MOVEMENT_TYPES[type].permission));
}

/**
 * One button per movement type the session may record. An operator sees only
 * the dispatch; a manager sees all four. Nothing renders when none apply.
 */
export function NewMovementActions({ className }: { className?: string }) {
  const t = useTranslations('movements.types');
  const types = useAllowedTypes();

  if (types.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {types.map((type, index) => (
        <Button key={type} size="lg" variant={index === 0 ? 'primary' : 'secondary'} asChild>
          <Link href={ROUTES.newMovement(type)}>
            {TYPE_ICONS[type]}
            {t(`${type}.action`)}
          </Link>
        </Button>
      ))}
    </div>
  );
}

/**
 * The same row, named and boxed, for the screen that opens on it rather than
 * hanging it off a heading. Loose in the middle of a dashboard those buttons
 * belong to nothing in particular; inside a titled panel they are plainly where
 * the day's work starts.
 *
 * Hidden on a phone, where the floating button is the way in.
 */
export function NewMovementPanel() {
  const t = useTranslations('movements.new');
  const types = useAllowedTypes();

  if (types.length === 0) return null;

  return (
    <Card className="hidden space-y-4 bg-contrast/5 sm:block">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-accent">{t('title')}</h2>
        <p className="text-sm text-contrast/60">{t('subtitle')}</p>
      </div>
      <NewMovementActions />
    </Card>
  );
}

/**
 * The same choice as a floating button, for the screens where the row above sits
 * in a header that scrolls away. An operator gets a single button straight to
 * the dispatch; a manager gets the four to choose from.
 */
export function NewMovementFab() {
  const t = useTranslations('movements.types');
  const tActions = useTranslations('common.actions');
  const types = useAllowedTypes();

  return (
    <FloatingAction
      label={tActions('newMovement')}
      items={types.map((type) => ({
        label: t(`${type}.action`),
        href: ROUTES.newMovement(type),
        icon: TYPE_ICONS[type],
      }))}
    />
  );
}
