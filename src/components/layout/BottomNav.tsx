'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { MAIN_NAVIGATION, visibleNavigation } from '@/config/navigation';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { AccountActions } from './AccountActions';
import { MORE_ICON, NAV_ICONS } from './nav-icons';

/**
 * How many destinations reach the bar itself.
 *
 * Four plus the overflow is five targets across the narrowest phone, which is
 * about as many as stay comfortably wider than a thumb. What does not fit is not
 * hidden, it moves one tap away.
 */
const TABS = 4;

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const tabStyles = 'h-full flex-1 flex-col gap-0.5 rounded-none px-1 py-2 text-[0.625rem]';

/** A tab: glyph over a short label, the pair of them one target. */
function Tab({
  icon,
  label,
  isActive,
  href,
  onClick,
  ...props
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  href?: string;
  onClick?: () => void;
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
}) {
  const className = cn(tabStyles, isActive ? 'text-accent' : 'text-contrast/60');
  const content = (
    <>
      {icon}
      {/* A button never wraps, and a label can be wider than its share of the
          row, so this is where a long word is allowed to be cut instead. */}
      <span className="max-w-full truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Button variant="ghost" className={className} asChild {...props}>
        <Link href={href} aria-current={isActive ? 'page' : undefined}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button variant="ghost" className={className} onClick={onClick} {...props}>
      {content}
    </Button>
  );
}

/**
 * The product's navigation on a phone, in the half of the screen the thumb
 * already reaches.
 *
 * It replaces a row of text pills that scrolled sideways inside the header:
 * nothing announced that there was anything past the edge, so whatever did not
 * fit — reports and administration, for the roles that have them — was
 * effectively gone, and the active section could load off-screen. Here the four
 * most-used sections are always in view and the rest is behind one tap, which is
 * a place rather than a guess.
 *
 * Below `sm` only: on a desktop the header does not scroll away, and a row
 * beside the title is both conventional there and no harder to reach.
 */
export function BottomNav() {
  const t = useTranslations('nav');
  const { can } = useAuth();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const items = visibleNavigation(MAIN_NAVIGATION, can);
  const tabs = items.slice(0, TABS);
  const overflow = items.slice(TABS);

  // Reaching a section from the sheet would otherwise leave it open over it.
  useEffect(() => {
    setIsSheetOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        aria-label={t('main')}
        className={cn(
          'fixed inset-x-0 bottom-0 z-sticky sm:hidden',
          'border-t border-border bg-surface/95 backdrop-blur-md',
          // Below the tabs, not inside them: the home indicator owns the last
          // few millimetres of the screen and a tap there belongs to the system.
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <div className="flex h-16 items-stretch">
          {tabs.map((item) => (
            <Tab
              key={item.href}
              href={item.href}
              icon={NAV_ICONS[item.label]}
              label={t(`items.${item.label}`)}
              isActive={isCurrent(pathname, item.href)}
            />
          ))}

          <Tab
            icon={MORE_ICON}
            label={t('more')}
            // Nothing behind it is "the current page": it is a door, not a place.
            isActive={false}
            aria-haspopup="dialog"
            aria-expanded={isSheetOpen}
            onClick={() => setIsSheetOpen(true)}
          />
        </div>
      </nav>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent placement="bottom" className="space-y-4">
          <DialogTitle>{t('more')}</DialogTitle>
          <DialogDescription className="sr-only">{t('moreDescription')}</DialogDescription>

          {overflow.length > 0 && (
            <div className="space-y-2">
              {overflow.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="lg"
                  className={cn(
                    'w-full justify-start',
                    isCurrent(pathname, item.href) && 'bg-accent/10 text-accent',
                  )}
                  asChild
                >
                  <Link
                    href={item.href}
                    aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
                  >
                    {NAV_ICONS[item.label]}
                    {t(`items.${item.label}`)}
                  </Link>
                </Button>
              ))}
            </div>
          )}

          <AccountActions onNavigate={() => setIsSheetOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
