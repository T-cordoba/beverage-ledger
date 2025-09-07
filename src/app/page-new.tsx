"use client";
import { useEffect, useState, useRef } from "react";
import type { Licor } from "./actions-licores";
import { createMovimiento, getMovimientos, type Movimiento, type Licor as LicorMovimiento } from "./actions";

// Components
import NotificationSystem, { useNotifications } from "../components/NotificationSystem/NotificationSystem";
import Navigation from "../components/Navigation/Navigation";
import SelectionSection from "../components/Sections/SelectionSection";
import HistorySection from "../components/Sections/HistorySection";
import StatisticsSection from "../components/Sections/StatisticsSection";
import ConfirmModal from "../components/Modals/ConfirmModal";
import CancelModal from "../components/Modals/CancelModal";
import ScrollToCheckoutButton from "../components/ScrollToCheckoutButton/ScrollToCheckoutButton";

async function fetchLicores(): Promise<Licor[]> {
	const res = await fetch("/api/licores", { cache: "no-store" });
	if (!res.ok) return [];
	return res.json();
}

export default function HomePage() {
	const [licores, setLicores] = useState<Licor[]>([]);
	const [loadingLicores, setLoadingLicores] = useState(true);
	const [cantidades, setCantidades] = useState<Record<string, { botellas: number; cajas: number }>>({});
	const [searchTerm, setSearchTerm] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [activeSection, setActiveSection] = useState<'seleccion' | 'historial' | 'estadisticas'>('seleccion');
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
	const [loadingMovimientos, setLoadingMovimientos] = useState(false);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const [buttonHasAppeared, setButtonHasAppeared] = useState(false);
	const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [movementSearchTerm, setMovementSearchTerm] = useState("");
	const [dateFilter, setDateFilter] = useState("");
	const [showDatePicker, setShowDatePicker] = useState(false);
	
	// Notification system
	const { notifications, showNotification, removeNotification } = useNotifications();

	// Handle section changes with slide animation
	const handleSectionChange = (newSection: 'seleccion' | 'historial' | 'estadisticas') => {
		if (newSection === activeSection || isTransitioning) return;
		
		// Determine slide direction based on section order
		const sectionOrder = ['seleccion', 'historial', 'estadisticas'];
		const currentIndex = sectionOrder.indexOf(activeSection);
		const newIndex = sectionOrder.indexOf(newSection);
		
		// Set slide direction: right if moving forward, left if moving backward
		setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
		setIsTransitioning(true);
		
		// Start slide out
		setTimeout(() => {
			setActiveSection(newSection);
			// Slide in after section change
			setTimeout(() => {
				setIsTransitioning(false);
			}, 50);
		}, 200);
	};

	// Statistics states
	const [statisticsData, setStatisticsData] = useState<any>(null);
	const [statisticsTimeRange, setStatisticsTimeRange] = useState<'week' | 'month' | 'year'>('month');
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

	// Load movements when switching to history section
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

	// Load movements when accessing history section
	useEffect(() => {
		if (activeSection === 'historial' && movimientos.length === 0) {
			loadMovimientos();
		}
	}, [activeSection, movimientos.length]);

	// Scroll detection for floating button
	useEffect(() => {
		const handleScroll = () => {
			if (activeSection !== 'seleccion') return;

			const scrollY = window.scrollY;
			const windowHeight = window.innerHeight;
			const documentHeight = document.documentElement.scrollHeight;
			
			// Get checkout button position
			const checkoutButton = document.querySelector('[data-checkout-button]');
			if (!checkoutButton) return;

			const buttonRect = checkoutButton.getBoundingClientRect();
			const buttonIsVisible = buttonRect.top >= 0 && buttonRect.bottom <= windowHeight;
			
			// Show floating button when scrolled enough and checkout is not visible
			const shouldShow = scrollY > 300 && !buttonIsVisible;
			
			if (shouldShow && !showScrollButton) {
				setShowScrollButton(true);
				// Track that button has appeared for animation control
				if (!buttonHasAppeared) {
					setButtonHasAppeared(true);
				}
			} else if (!shouldShow && showScrollButton) {
				setShowScrollButton(false);
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [activeSection, showScrollButton, buttonHasAppeared]);

	const handleChange = (id: string, type: 'botellas' | 'cajas', delta: number) => {
		setCantidades(prev => {
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
					[type]: newValue
				}
			};
		});
	};

	// Check if there are selected items
	const hasSelectedItems = Object.entries(cantidades).some(
		([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
	);

	// Calculate totals for display
	const totalBottles = Object.values(cantidades).reduce((sum, cantidad) => sum + cantidad.botellas, 0);
	const totalCases = Object.values(cantidades).reduce((sum, cantidad) => sum + cantidad.cajas, 0);
	const totalItems = Object.values(cantidades).reduce((sum, cantidad) => sum + cantidad.botellas + cantidad.cajas, 0);
	const uniqueLiquors = Object.keys(cantidades).filter(id => {
		const cantidad = cantidades[id];
		return cantidad.botellas > 0 || cantidad.cajas > 0;
	}).length;

	const handleConfirmar = () => {
		if (!hasSelectedItems) {
			showNotification('warning', 'No Selection', 'Please select at least one item before confirming.');
			return;
		}
		setShowConfirmModal(true);
	};

	const executeMovement = async () => {
		if (!hasSelectedItems) return;

		setSubmitting(true);
		try {
			// Convert cantidades to the expected format
			const licoresData: LicorMovimiento[] = Object.entries(cantidades).flatMap(([id, cantidad]) => {
				const licor = licores.find(l => l.id.toString() === id);
				const items: LicorMovimiento[] = [];
				
				// Add bottles if there's quantity
				if (cantidad.botellas > 0) {
					items.push({
						name: licor?.name || '',
						type: licor?.type || '',
						quantity: cantidad.botellas,
						unit: 'bottle' as const
					});
				}
				
				// Add cases if there's quantity
				if (cantidad.cajas > 0) {
					items.push({
						name: licor?.name || '',
						type: licor?.type || '',
						quantity: cantidad.cajas,
						unit: 'case' as const
					});
				}
				
				return items;
			});

			// Create the movement
			await createMovimiento({
				date: new Date().toISOString(),
				liquors: licoresData
			});

			// Clear the form
			setCantidades({});
			setSearchTerm('');
			
			// Reload movements if we're in that section
			if (activeSection === 'historial') {
				loadMovimientos();
			}
			
			showNotification('success', 'Movement Registered', 'The liquor movement has been recorded successfully.');
		} catch (error) {
			console.error('Error creating movement:', error);
			showNotification('error', 'Registration Failed', 'Error registering movement. Please try again.');
		} finally {
			setSubmitting(false);
			setShowConfirmModal(false);
		}
	};

	const handleCancelMovement = () => {
		// Check if there are any selections to cancel
		if (!hasSelectedItems) {
			showNotification('info', 'No Items to Cancel', 'There are no selected items to cancel.');
			return;
		}

		// Show cancel confirmation modal
		setShowCancelModal(true);
	};

	const executeCancelMovement = () => {
		// Clear all selections
		setCantidades({});
		setSearchTerm('');
		setShowCancelModal(false);
		showNotification('info', 'Movement Cancelled', 'All selected items have been cleared.');
		
		// Scroll to top of page
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	};

	// Function to scroll to checkout section with smooth animation
	const scrollToCheckout = () => {
		const checkoutButton = document.querySelector('[data-checkout-button]');
		if (checkoutButton) {
			// Get responsive offset based on screen size
			const isMobile = window.innerWidth < 768;
			const offset = isMobile ? 80 : 100;
			
			// Get the position and add offset
			const buttonRect = checkoutButton.getBoundingClientRect();
			const targetPosition = window.pageYOffset + buttonRect.top - offset;
			const startPosition = window.pageYOffset;
			const distance = targetPosition - startPosition;
			const duration = 800; // Longer duration for more noticeable animation
			let start: number | null = null;

			const easeInOutCubic = (t: number): number => {
				return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			};

			const animateScroll = (timestamp: number) => {
				if (!start) start = timestamp;
				const progress = timestamp - start;
				const progressPercentage = Math.min(progress / duration, 1);
				
				// Apply easing function for smooth animation
				const easedProgress = easeInOutCubic(progressPercentage);
				const currentPosition = startPosition + distance * easedProgress;
				
				window.scrollTo(0, currentPosition);
				
				if (progress < duration) {
					requestAnimationFrame(animateScroll);
				} else {
					// Ensure we end up exactly at the target position
					window.scrollTo(0, targetPosition);
				}
			};

			// Start the animation
			requestAnimationFrame(animateScroll);
		}
	};

	// Function to toggle movement expansion
	const toggleMovementExpansion = (movementId: string) => {
		setExpandedMovements(prev => {
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
			{/* Header */}
			<header className="border-b border-border bg-gradient-to-r from-background to-cardBg backdrop-blur-sm">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<div className="flex flex-col items-center justify-center">
						<div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
							<img 
								src="/ebl-logo.png" 
								alt="EBL Logo" 
								className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
							/>
							<div className="text-center">
								<h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-accent tracking-wide">
									ENCORE BEVERAGE LEDGER
								</h1>
								<p className="text-xs sm:text-sm lg:text-base text-secondary/60 font-light tracking-widest uppercase mt-1">
									Premium Liquor Management System
								</p>
							</div>
						</div>
						
						<Navigation 
							activeSection={activeSection}
							onSectionChange={handleSectionChange}
						/>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
				<div className={`transition-all duration-300 ease-in-out ${
					isTransitioning 
						? `transform ${slideDirection === 'right' ? 'translate-x-8' : '-translate-x-8'} opacity-0` 
						: 'transform translate-x-0 opacity-100'
				}`}>
					<div className="space-y-8 lg:space-y-12">
						{activeSection === 'seleccion' ? (
							<SelectionSection
								licores={licores}
								loadingLicores={loadingLicores}
								cantidades={cantidades}
								searchTerm={searchTerm}
								submitting={submitting}
								onQuantityChange={handleChange}
								onSearchChange={setSearchTerm}
								onConfirm={handleConfirmar}
								onCancel={handleCancelMovement}
							/>
						) : activeSection === 'historial' ? (
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
						) : activeSection === 'estadisticas' ? (
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
			
			{/* Floating Go to Checkout Button */}
			{activeSection === 'seleccion' && hasSelectedItems && (
				<ScrollToCheckoutButton
					showScrollButton={showScrollButton}
					buttonHasAppeared={buttonHasAppeared}
					onScrollToCheckout={scrollToCheckout}
				/>
			)}

			{/* Modals */}
			<ConfirmModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={executeMovement}
				totalItems={uniqueLiquors}
				totalQuantity={totalItems}
				submitting={submitting}
			/>

			<CancelModal
				isOpen={showCancelModal}
				onClose={() => setShowCancelModal(false)}
				onConfirm={executeCancelMovement}
			/>

			{/* Notifications */}
			<NotificationSystem
				notifications={notifications}
				removeNotification={removeNotification}
			/>
		</div>
	);
}
