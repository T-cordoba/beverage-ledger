'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPE_ORDER, MOVEMENT_TYPES } from './movement-types';

/**
 * One button per movement type the session may record. An operator sees only
 * the dispatch; a manager sees all four. Nothing renders when none apply.
 */
export function NewMovementActions({ className }: { className?: string }) {
  const t = useTranslations('movements.types');
  const { can } = useAuth();
  const types = MOVEMENT_TYPE_ORDER.filter((type) => can(MOVEMENT_TYPES[type].permission));

  if (types.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {types.map((type, index) => (
        <Button key={type} size="lg" variant={index === 0 ? 'primary' : 'secondary'} asChild>
          <Link href={ROUTES.newMovement(type)}>{t(`${type}.action`)}</Link>
        </Button>
      ))}
    </div>
  );
}
