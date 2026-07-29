import { NavTabButton } from '@/components/UI/Button';

interface NavigationProps {
  activeSection: 'seleccion' | 'historial' | 'estadisticas';
  onSectionChange: (section: 'seleccion' | 'historial' | 'estadisticas') => void;
}

export default function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  return (
    <nav className="border-b border-border bg-cardBg/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          <NavTabButton
            isActive={activeSection === 'seleccion'}
            onClick={() => onSectionChange('seleccion')}
          >
            Liquor Selection
          </NavTabButton>
          <NavTabButton
            isActive={activeSection === 'historial'}
            onClick={() => onSectionChange('historial')}
          >
            Movement History
          </NavTabButton>
          <NavTabButton
            isActive={activeSection === 'estadisticas'}
            onClick={() => onSectionChange('estadisticas')}
          >
            Statistics
          </NavTabButton>
        </div>
      </div>
    </nav>
  );
}
