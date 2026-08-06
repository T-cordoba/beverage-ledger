import type { ReactNode } from 'react';
import type { MainNavigationLabel } from '@/config/navigation';

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
 * One glyph per section, for the phone's tab bar.
 *
 * A tab is a target the width of a thumb, so the label under it has to be short
 * and the icon is what carries the recognition. `movements` is drawn as two
 * arrows crossing because direction is what the section is about, and it is the
 * same idea the four movement buttons already use.
 */
export const NAV_ICONS: Record<MainNavigationLabel, ReactNode> = {
  dashboard: (
    <Glyph d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  ),
  stock: (
    <Glyph d="M20.25 7.5l-8.25-4.5-8.25 4.5m16.5 0v9l-8.25 4.5m8.25-13.5l-8.25 4.5m0 9v-9m0 9l-8.25-4.5m8.25-4.5L3.75 7.5m0 0v9" />
  ),
  movements: (
    <Glyph d="M7.5 3.75v16.5m0 0L3.75 16.5M7.5 20.25l3.75-3.75M16.5 20.25V3.75m0 0L12.75 7.5M16.5 3.75l3.75 3.75" />
  ),
  catalog: <Glyph d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />,
  reports: <Glyph d="M3 20.25h18M6.75 20.25v-6.75m5.25 6.75V6.75m5.25 13.5v-9.75" />,
  admin: (
    <Glyph d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.28c.063.375.313.687.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.03 7.03 0 010 .255c-.008.379.137.75.43.991l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.397-1.11-.94l-.213-1.28c-.062-.375-.312-.687-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.828c.292-.24.437-.612.43-.991a6.93 6.93 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.248a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.077-.124.072-.044.146-.086.22-.128.332-.182.582-.494.644-.869l.214-1.28z" />
  ),
};
