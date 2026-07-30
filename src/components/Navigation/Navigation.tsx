import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type Section = 'seleccion' | 'historial' | 'estadisticas';

interface NavigationProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const sections: { id: Section; label: ReactNode }[] = [
  { id: 'seleccion', label: 'Liquor Selection' },
  { id: 'historial', label: 'Movement History' },
  { id: 'estadisticas', label: 'Statistics' },
];

export default function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  return (
    <nav className="sticky top-0 z-sticky border-b border-border bg-cardBg/50 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {sections.map(({ id, label }) => (
            <Button
              key={id}
              variant="ghost"
              size="lg"
              className={cn(
                'rounded-none border-b-2 px-4 text-sm hover:bg-transparent sm:px-6 sm:text-base',
                activeSection === id
                  ? 'border-accent text-accent'
                  : 'border-transparent hover:border-contrast/30',
              )}
              onClick={() => onSectionChange(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
