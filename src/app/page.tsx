'use client';
import { useEffect, useState, useReducer } from 'react';
import type { Licor } from './actions-licores';
import { createMovimiento, getMovimientos, type Movimiento } from './actions';

import NotificationSystem, { useNotifications } from '@/components/NotificationSystem';
import Navigation from '@/components/Navigation';
import { SelectionSection, HistorySection, StatisticsSection } from '@/components/Sections';
import { ConfirmModal, CancelModal } from '@/components/Modals';
import ScrollToCheckoutButton from '@/components/ScrollToCheckoutButton';

type LicorMovementData = {
  id: string;
  name: string;
  type: string;
  brand?: string;
  subcategory?: string;
  abv?: number;
  origin?: string;
  age?: string;
  quantity: number;
  unit: 'bottle' | 'case';
};
type StatisticsData = { name: string; quantity: number };

interface UIState {
  activeSection: 'seleccion' | 'historial' | 'estadisticas';
  isTransitioning: boolean;
  slideDirection: 'left' | 'right';
  showScrollButton: boolean;
  buttonHasAppeared: boolean;
}

type UIAction =
  | { type: 'SET_SLIDE_DIRECTION'; payload: 'left' | 'right' }
  | { type: 'START_TRANSITION' }
  | { type: 'SET_SECTION'; payload: 'seleccion' | 'historial' | 'estadisticas' }
  | { type: 'END_TRANSITION' }
  | { type: 'SHOW_SCROLL_BUTTON' }
  | { type: 'HIDE_SCROLL_BUTTON' }
  | { type: 'MARK_BUTTON_APPEARED' };

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_SLIDE_DIRECTION':
      return { ...state, slideDirection: action.payload };
    case 'START_TRANSITION':
      return { ...state, isTransitioning: true };
    case 'SET_SECTION':
      return { ...state, activeSection: action.payload };
    case 'END_TRANSITION':
      return { ...state, isTransitioning: false };
    case 'SHOW_SCROLL_BUTTON':
      return {
        ...state,
        showScrollButton: true,
        buttonHasAppeared: true,
      };
    case 'HIDE_SCROLL_BUTTON':
      return { ...state, showScrollButton: false };
    case 'MARK_BUTTON_APPEARED':
      return { ...state, buttonHasAppeared: true };
    default:
      return state;
  }
};

const initialUIState: UIState = {
  activeSection: 'seleccion',
  isTransitioning: false,
  slideDirection: 'right',
  showScrollButton: false,
  buttonHasAppeared: false,
};

interface ModalsState {
  showConfirmModal: boolean;
  showCancelModal: boolean;
}

type ModalsAction =
  | { type: 'SHOW_CONFIRM_MODAL' }
  | { type: 'HIDE_CONFIRM_MODAL' }
  | { type: 'SHOW_CANCEL_MODAL' }
  | { type: 'HIDE_CANCEL_MODAL' }
  | { type: 'HIDE_ALL_MODALS' };

const modalsReducer = (state: ModalsState, action: ModalsAction): ModalsState => {
  switch (action.type) {
    case 'SHOW_CONFIRM_MODAL':
      return { ...state, showConfirmModal: true };
    case 'HIDE_CONFIRM_MODAL':
      return { ...state, showConfirmModal: false };
    case 'SHOW_CANCEL_MODAL':
      return { ...state, showCancelModal: true };
    case 'HIDE_CANCEL_MODAL':
      return { ...state, showCancelModal: false };
    case 'HIDE_ALL_MODALS':
      return { showConfirmModal: false, showCancelModal: false };
    default:
      return state;
  }
};

const initialModalsState: ModalsState = {
  showConfirmModal: false,
  showCancelModal: false,
};

async function fetchLicores(): Promise<Licor[]> {
  const res = await fetch('/api/licores', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default function HomePage() {
  const [uiState, dispatchUI] = useReducer(uiReducer, initialUIState);
  const [modalsState, dispatchModals] = useReducer(modalsReducer, initialModalsState);

  const [licores, setLicores] = useState<Licor[]>([]);
  const [loadingLicores, setLoadingLicores] = useState(true);
  const [cantidades, setCantidades] = useState<Record<string, { botellas: number; cajas: number }>>(
    {},
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { notifications, showNotification, removeNotification } = useNotifications();

  const handleSectionChange = (newSection: 'seleccion' | 'historial' | 'estadisticas') => {
    if (newSection === uiState.activeSection || uiState.isTransitioning) return;

    const sectionOrder = ['seleccion', 'historial', 'estadisticas'];
    const currentIndex = sectionOrder.indexOf(uiState.activeSection);
    const newIndex = sectionOrder.indexOf(newSection);

    const direction = newIndex > currentIndex ? 'right' : 'left';
    dispatchUI({ type: 'SET_SLIDE_DIRECTION', payload: direction });
    dispatchUI({ type: 'START_TRANSITION' });

    setTimeout(() => {
      dispatchUI({ type: 'SET_SECTION', payload: newSection });
      setTimeout(() => {
        dispatchUI({ type: 'END_TRANSITION' });
      }, 50);
    }, 200);
  };

  const [statisticsData, setStatisticsData] = useState<StatisticsData[]>([]);
  const [statisticsTimeRange, setStatisticsTimeRange] = useState<'week' | 'month' | 'year'>(
    'month',
  );
  const [statisticsView, setStatisticsView] = useState<'liquor' | 'type'>('liquor');
  const [loadingStatistics, setLoadingStatistics] = useState(false);

  useEffect(() => {
    const loadLicores = async () => {
      setLoadingLicores(true);
      try {
        const data = await fetchLicores();
        setLicores(data);
      } catch (error) {
        console.error('Error loading licores:', error);
      } finally {
        setLoadingLicores(false);
      }
    };
    loadLicores();
  }, []);

  const loadMovimientos = async () => {
    setLoadingMovimientos(true);
    try {
      const data = await getMovimientos();
      setMovimientos(data);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    if (uiState.activeSection === 'historial' && movimientos.length === 0) {
      loadMovimientos();
    }
  }, [uiState.activeSection, movimientos.length]);

  const loadStatistics = async () => {
    setLoadingStatistics(true);
    try {
      const data = await getMovimientos();
      const now = new Date();
      const startDate = new Date();

      switch (statisticsTimeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const filteredMovements = data.filter((movement) => new Date(movement.date) >= startDate);

      const stats: Record<string, number> = {};

      filteredMovements.forEach((movement) => {
        movement.liquors.forEach((liquor) => {
          const key = statisticsView === 'liquor' ? liquor.name : liquor.type;
          stats[key] = (stats[key] || 0) + liquor.quantity;
        });
      });

      const sortedStats = Object.entries(stats)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);

      setStatisticsData(sortedStats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoadingStatistics(false);
    }
  };

  useEffect(() => {
    if (uiState.activeSection === 'historial' && movimientos.length === 0) {
      loadMovimientos();
    }
    if (uiState.activeSection === 'estadisticas') {
      loadStatistics();
    }
  }, [uiState.activeSection, statisticsTimeRange, statisticsView]);

  useEffect(() => {
    const handleScroll = () => {
      if (uiState.activeSection !== 'seleccion') return;

      const checkoutButton = document.querySelector('[data-checkout-button]');
      if (!checkoutButton) return;

      const buttonRect = checkoutButton.getBoundingClientRect();
      const buttonIsVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;

      const shouldShow = !buttonIsVisible;

      if (shouldShow && !uiState.showScrollButton) {
        dispatchUI({ type: 'SHOW_SCROLL_BUTTON' });
      } else if (!shouldShow && uiState.showScrollButton) {
        dispatchUI({ type: 'HIDE_SCROLL_BUTTON' });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [uiState.activeSection, uiState.showScrollButton, uiState.buttonHasAppeared]);

  const handleChange = (id: string, type: 'botellas' | 'cajas', delta: number) => {
    setCantidades((prev) => {
      const current = prev[id] || { botellas: 0, cajas: 0 };
      const newValue = Math.max(0, current[type] + delta);

      if (newValue === 0 && current[type === 'botellas' ? 'cajas' : 'botellas'] === 0) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          [type]: newValue,
        },
      };
    });
  };

  const hasSelectedItems = Object.entries(cantidades).some(
    ([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0,
  );

  const totalItems = Object.values(cantidades).reduce(
    (sum, cantidad) => sum + cantidad.botellas + cantidad.cajas,
    0,
  );
  const uniqueLiquors = Object.keys(cantidades).filter((id) => {
    const cantidad = cantidades[id];
    return cantidad.botellas > 0 || cantidad.cajas > 0;
  }).length;

  const handleConfirmar = () => {
    if (!hasSelectedItems) {
      showNotification(
        'warning',
        'No Selection',
        'Please select at least one item before confirming.',
      );
      return;
    }
    dispatchModals({ type: 'SHOW_CONFIRM_MODAL' });
  };

  const executeMovement = async () => {
    if (!hasSelectedItems) return;

    setSubmitting(true);
    try {
      const licoresData: LicorMovementData[] = Object.entries(cantidades).flatMap(
        ([id, cantidad]) => {
          const licor = licores.find((l) => l.id.toString() === id);
          const items: LicorMovementData[] = [];

          if (cantidad.botellas > 0) {
            items.push({
              id: licor?.id || '',
              name: licor?.name || '',
              type: licor?.type || '',
              brand: licor?.brand,
              subcategory: licor?.subcategory,
              abv: licor?.abv,
              origin: licor?.origin,
              age: licor?.age,
              quantity: cantidad.botellas,
              unit: 'bottle' as const,
            });
          }

          if (cantidad.cajas > 0) {
            items.push({
              id: licor?.id || '',
              name: licor?.name || '',
              type: licor?.type || '',
              brand: licor?.brand,
              subcategory: licor?.subcategory,
              abv: licor?.abv,
              origin: licor?.origin,
              age: licor?.age,
              quantity: cantidad.cajas,
              unit: 'case' as const,
            });
          }

          return items;
        },
      );

      await createMovimiento({
        date: new Date().toISOString(),
        liquors: licoresData,
      });

      setCantidades({});
      setSearchTerm('');
      setTypeFilter('');

      loadMovimientos();

      showNotification(
        'success',
        'Movement Registered',
        'The liquor movement has been recorded successfully.',
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error('Error creating movement:', error);
      showNotification(
        'error',
        'Registration Failed',
        'Error registering movement. Please try again.',
      );
    } finally {
      setSubmitting(false);
      dispatchModals({ type: 'HIDE_CONFIRM_MODAL' });
    }
  };

  const handleCancelMovement = () => {
    if (!hasSelectedItems) {
      showNotification('info', 'No Items to Cancel', 'There are no selected items to cancel.');
      return;
    }

    dispatchModals({ type: 'SHOW_CANCEL_MODAL' });
  };

  const executeCancelMovement = () => {
    setCantidades({});
    setSearchTerm('');
    setTypeFilter('');
    dispatchModals({ type: 'HIDE_CANCEL_MODAL' });
    showNotification('info', 'Movement Cancelled', 'All selected items have been cleared.');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToCheckout = () => {
    const checkoutButton = document.querySelector('[data-checkout-button]');
    if (checkoutButton) {
      const isMobile = window.innerWidth < 768;
      const offset = isMobile ? 80 : 100;

      const buttonRect = checkoutButton.getBoundingClientRect();
      const targetPosition = window.pageYOffset + buttonRect.top - offset;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 800;
      let start: number | null = null;

      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const animateScroll = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const progressPercentage = Math.min(progress / duration, 1);

        const easedProgress = easeInOutCubic(progressPercentage);
        const currentPosition = startPosition + distance * easedProgress;

        window.scrollTo(0, currentPosition);

        if (progress < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          window.scrollTo(0, targetPosition);
        }
      };

      requestAnimationFrame(animateScroll);
    }
  };

  const toggleMovementExpansion = (movementId: string) => {
    setExpandedMovements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(movementId)) {
        newSet.delete(movementId);
      } else {
        newSet.add(movementId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="border-b border-border bg-gradient-to-r from-background to-cardBg backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4">
              <img
                src="/bl-logo.png"
                alt="Beverage Ledger"
                className="h-24 sm:h-32 lg:h-40 w-auto"
              />
            </div>
            <p className="text-secondary/80 text-sm sm:text-base lg:text-lg font-light text-center">
              Liquor inventory management for Premium Casino Operations.
            </p>
          </div>
        </div>
      </header>

      <Navigation activeSection={uiState.activeSection} onSectionChange={handleSectionChange} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div
          className={`transition-all duration-300 ease-in-out ${
            uiState.isTransitioning
              ? `transform ${uiState.slideDirection === 'right' ? 'translate-x-8' : '-translate-x-8'} opacity-0`
              : 'transform translate-x-0 opacity-100'
          }`}
        >
          <div className="space-y-8 lg:space-y-12">
            {uiState.activeSection === 'seleccion' ? (
              <SelectionSection
                licores={licores}
                loadingLicores={loadingLicores}
                cantidades={cantidades}
                searchTerm={searchTerm}
                typeFilter={typeFilter}
                submitting={submitting}
                onQuantityChange={handleChange}
                onSearchChange={setSearchTerm}
                onTypeFilterChange={setTypeFilter}
                onConfirm={handleConfirmar}
                onCancel={handleCancelMovement}
              />
            ) : uiState.activeSection === 'historial' ? (
              <HistorySection
                movimientos={movimientos}
                loadingMovimientos={loadingMovimientos}
                movementSearchTerm={movementSearchTerm}
                dateFilter={dateFilter}
                showDatePicker={showDatePicker}
                expandedMovements={expandedMovements}
                onSearchChange={setMovementSearchTerm}
                setDateFilter={setDateFilter}
                setShowDatePicker={setShowDatePicker}
                onToggleExpansion={toggleMovementExpansion}
              />
            ) : uiState.activeSection === 'estadisticas' ? (
              <StatisticsSection
                statisticsData={statisticsData}
                statisticsTimeRange={statisticsTimeRange}
                statisticsView={statisticsView}
                loadingStatistics={loadingStatistics}
                onTimeRangeChange={setStatisticsTimeRange}
                onViewChange={setStatisticsView}
              />
            ) : null}
          </div>
        </div>
      </main>

      {uiState.activeSection === 'seleccion' && hasSelectedItems && (
        <ScrollToCheckoutButton
          showScrollButton={uiState.showScrollButton}
          buttonHasAppeared={uiState.buttonHasAppeared}
          onScrollToCheckout={scrollToCheckout}
        />
      )}

      <ConfirmModal
        isOpen={modalsState.showConfirmModal}
        onClose={() => dispatchModals({ type: 'HIDE_CONFIRM_MODAL' })}
        onConfirm={executeMovement}
        totalItems={uniqueLiquors}
        totalQuantity={totalItems}
        submitting={submitting}
      />

      <CancelModal
        isOpen={modalsState.showCancelModal}
        onClose={() => dispatchModals({ type: 'HIDE_CANCEL_MODAL' })}
        onConfirm={executeCancelMovement}
      />

      <NotificationSystem notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
}
