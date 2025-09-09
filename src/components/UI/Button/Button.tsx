import { ButtonHTMLAttributes, ReactNode } from 'react';

// Variantes
type ButtonVariant = 
  | 'primary'           // bg-accent hover:bg-accentHover (amarillo)
  | 'secondary'         // bg-border/50 hover:bg-border (gris)
  | 'ghost'             // transparent (para navegación)
  | 'filter'            // Para botones de filtro/toggle
  | 'danger'            // bg-red-500/10 hover:bg-red-500/20 (rojo transparente)
  | 'destructive'       // bg-red-600 hover:bg-red-700 (rojo sólido para acciones irreversibles)
  | 'icon'              // Para botones pequeños redondos
  | 'navTab'            // Para tabs de navegación
  | 'quantityMinus'     // Para botones - de cantidad
  | 'quantityPlus'      // Para botones + de cantidad
  | 'clearSearch'       // Para botón X de limpiar búsqueda
  | 'dropdown'          // Para botón principal de dropdown
  | 'dropdownItem';     // Para items dentro del dropdown

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;  // Para estados toggle/filter
  isLoading?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const buttonVariants = {
  primary: 'px-6 py-3 bg-accent hover:bg-accentHover text-background rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
  
  secondary: 'px-6 py-3 bg-border/50 hover:bg-border text-secondary hover:text-primary rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
  
  ghost: 'bg-transparent hover:bg-transparent border-transparent hover:border-transparent text-secondary/60 hover:text-secondary transition-colors',
  
  filter: 'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-none rounded-none',
  
  danger: 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl font-medium transition-all duration-200',
  
  destructive: 'px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200',
  
  icon: 'bg-accent/20 hover:bg-accent/40 text-accent border-transparent rounded-full flex items-center justify-center transition-colors',
  
  navTab: 'px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 rounded-none bg-transparent hover:bg-transparent',
  
  quantityMinus: 'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30',
  
  quantityPlus: 'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent hover:bg-accentHover text-background transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg shadow-lg hover:shadow-xl',
  
  clearSearch: 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center text-accent transition-colors',
  
  dropdown: 'w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-left flex items-center justify-between hover:border-accent/30 text-sm sm:text-base',
  
  dropdownItem: 'w-full px-4 sm:px-6 py-3 text-left text-sm sm:text-base transition-all duration-200 hover:bg-accent/10 hover:text-accent border-b border-border/20 rounded-none last:border-b-0'
};

const buttonSizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-2 text-xs sm:text-sm', 
  md: 'px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base',
  lg: 'px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg'
};

const filterActiveStyles = 'bg-accent text-background border-none';
const filterInactiveStyles = 'bg-background/50 text-secondary/80 hover:text-secondary hover:bg-background/70 border-none';

export default function Button({
  variant = 'primary',
  size = 'md',
  isActive = false,
  isLoading = false,
  className = '',
  children,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  // Obtener estilos de variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'filter':
        const filterBase = buttonVariants.filter;
        return isActive ? `${filterBase} ${filterActiveStyles}` : `${filterBase} ${filterInactiveStyles}`;
      case 'navTab':
        const navTabBase = buttonVariants.navTab;
        return isActive 
          ? `${navTabBase} text-accent border-b-accent` 
          : `${navTabBase} text-secondary/60 hover:text-secondary border-b-transparent hover:border-b-secondary/30`;
      case 'dropdownItem':
        const dropdownItemBase = buttonVariants.dropdownItem;
        return isActive 
          ? `${dropdownItemBase} bg-accent/20 text-accent font-medium` 
          : `${dropdownItemBase} text-secondary/80 hover:text-primary`;
      default:
        return buttonVariants[variant];
    }
  };

  // Para botones con padding incluido, no aplicar size automático
  const shouldApplyBaseStyles = !['clearSearch', 'quantityMinus', 'quantityPlus', 'dropdown', 'dropdownItem', 'primary', 'secondary', 'destructive'].includes(variant);
  const shouldApplySize = shouldApplyBaseStyles && variant !== 'icon';

  const baseStyles = shouldApplyBaseStyles ? 'font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2' : 'disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Combinar todas las clases
  const combinedClassName = [
    baseStyles,
    getVariantStyles(),
    shouldApplySize ? buttonSizes[size] : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && leftIcon}
          {children}
          {rightIcon && rightIcon}
        </>
      )}
    </button>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

export function FilterButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="filter" {...props} />;
}

export function IconButton(props: Omit<ButtonProps, 'variant' | 'size'>) {
  return <Button variant="icon" size="sm" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />;
}

export function DestructiveButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="destructive" {...props} />;
}

export function NavTabButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="navTab" {...props} />;
}

export function QuantityMinusButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="quantityMinus" {...props} />;
}

export function QuantityPlusButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="quantityPlus" {...props} />;
}

export function ClearSearchButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="clearSearch" {...props} />;
}

export function DropdownButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="dropdown" {...props} />;
}

export function DropdownItemButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="dropdownItem" {...props} />;
}
