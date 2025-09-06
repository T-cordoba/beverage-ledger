"use client";
import { useEffect, useState } from "react";
import type { Licor } from "./actions-licores";
import { createMovimiento, getMovimientos, type Movimiento } from "./actions";

async function fetchLicores(): Promise<Licor[]> {
	const res = await fetch("/api/licores", { cache: "no-store" });
	if (!res.ok) return [];
	return res.json();
}

export default function HomePage() {
	const [licores, setLicores] = useState<Licor[]>([]);
	const [cantidades, setCantidades] = useState<Record<string, { botellas: number; cajas: number }>>({});
	const [searchTerm, setSearchTerm] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [activeSection, setActiveSection] = useState<'seleccion' | 'historial' | 'estadisticas'>('seleccion');
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
	const [loadingMovimientos, setLoadingMovimientos] = useState(false);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const [buttonHasAppeared, setButtonHasAppeared] = useState(false);
	const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	
	// Notification system
	const [notifications, setNotifications] = useState<Array<{
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		title: string;
		message: string;
	}>>([]);

	// Notification functions
	const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
		const id = Date.now().toString();
		setNotifications(prev => [...prev, { id, type, title, message }]);
		
		// Auto remove after 5 seconds
		setTimeout(() => {
			removeNotification(id);
		}, 5000);
	};

	const removeNotification = (id: string) => {
		setNotifications(prev => prev.filter(notification => notification.id !== id));
	};

	// Statistics states
	const [statisticsData, setStatisticsData] = useState<any>(null);
	const [statisticsTimeRange, setStatisticsTimeRange] = useState<'week' | 'month' | 'year'>('month');
	const [statisticsView, setStatisticsView] = useState<'liquor' | 'type'>('liquor');
	const [loadingStatistics, setLoadingStatistics] = useState(false);

	useEffect(() => {
		fetchLicores().then(setLicores);
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

	const loadStatistics = async () => {
		setLoadingStatistics(true);
		try {
			const data = await getMovimientos();
			// Calculate statistics based on time range
			const now = new Date();
			let startDate = new Date();
			
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
			
			// Filter movements by date range
			const filteredMovements = data.filter(movement => 
				new Date(movement.date) >= startDate
			);
			
			// Calculate statistics by liquor or type
			const stats: Record<string, number> = {};
			
			filteredMovements.forEach(movement => {
				movement.liquors.forEach(liquor => {
					const key = statisticsView === 'liquor' ? liquor.name : liquor.type;
					stats[key] = (stats[key] || 0) + liquor.quantity;
				});
			});
			
			// Convert to sorted array for charts and leaderboard
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
		if (activeSection === 'historial') {
			loadMovimientos();
		}
		if (activeSection === 'estadisticas') {
			loadStatistics();
		}
	}, [activeSection, statisticsTimeRange, statisticsView]);

	// Effect to handle scroll detection for checkout button visibility
	useEffect(() => {
		let ticking = false;
		
		const handleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					const checkoutButton = document.querySelector('[data-checkout-button]');
					if (!checkoutButton) {
						setShowScrollButton(true);
						ticking = false;
						return;
					}

					const buttonRect = checkoutButton.getBoundingClientRect();
					const windowHeight = window.innerHeight;
					
					// For mobile, use a smaller margin (50px), for desktop use 100px
					const isMobile = window.innerWidth < 768;
					const margin = isMobile ? 50 : 100;
					
					// Hide scroll button when checkout button is visible (with responsive margin)
					const isCheckoutVisible = buttonRect.top < windowHeight - margin;
					const shouldShow = !isCheckoutVisible;
					
					// Track if button has appeared for entrance animation
					if (shouldShow && !buttonHasAppeared) {
						setButtonHasAppeared(true);
					}
					
					setShowScrollButton(shouldShow);
					
					ticking = false;
				});
			}
			ticking = true;
		};

		// Only add scroll listener when in selection mode
		if (activeSection === 'seleccion') {
			// Add both scroll and resize listeners for better mobile support
			window.addEventListener('scroll', handleScroll, { passive: true });
			window.addEventListener('resize', handleScroll, { passive: true });
			handleScroll(); // Check initial position
			
			return () => {
				window.removeEventListener('scroll', handleScroll);
				window.removeEventListener('resize', handleScroll);
			};
		} else {
			setShowScrollButton(true);
		}
	}, [activeSection, buttonHasAppeared]);

	// Helper function to translate unit names for display
	const getDisplayUnit = (unidad: string, cantidad: number) => {
		const unitMap: Record<string, string> = {
			'botella': 'bottle',
			'caja': 'case',
			'bottle': 'bottle',
			'case': 'case'
		};
		
		const englishUnit = unitMap[unidad] || unidad;
		return cantidad === 1 ? englishUnit : englishUnit + 's';
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

	// Check if there are any selected items
	const hasSelectedItems = Object.entries(cantidades).some(
		([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
	);

	const handleChange = (id: string, tipo: "botellas" | "cajas", delta: number) => {
		setCantidades((prev) => {
			const actual = prev[id] || { botellas: 0, cajas: 0 };
			const nuevo = {
				...actual,
				[tipo]: Math.max(0, actual[tipo] + delta),
			};
			return { ...prev, [id]: nuevo };
		});
	};

	const handleConfirmar = async () => {
		// Verify that at least one liquor is selected
		const licoresSeleccionados = Object.entries(cantidades).filter(
			([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
		);

		if (licoresSeleccionados.length === 0) {
			showNotification('warning', 'No Items Selected', 'You must select at least one liquor to confirm the movement.');
			return;
		}

		// Show confirmation modal instead of executing directly
		setShowConfirmModal(true);
	};

	const executeMovement = async () => {
		const licoresSeleccionados = Object.entries(cantidades).filter(
			([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
		);

		setSubmitting(true);
		try {
			// Prepare movement data
			const licoresData = licoresSeleccionados.flatMap(([id, cantidad]) => {
				const licor = licores.find(l => l.id.toString() === id);
				const items = [];
				
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
		const hasSelections = Object.entries(cantidades).some(
			([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
		);

		if (!hasSelections) {
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
	};

	// Filter liquors by name and type
	const licoresFiltrados = licores.filter((licor) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			licor.name.toLowerCase().includes(searchLower) ||
			licor.type.toLowerCase().includes(searchLower)
		);
	});

	// Sort liquors: those with selected quantities first
	const licoresOrdenados = [...licoresFiltrados].sort((a, b) => {
		const cantidadA = cantidades[a.id] || { botellas: 0, cajas: 0 };
		const cantidadB = cantidades[b.id] || { botellas: 0, cajas: 0 };
		
		const tieneSeleccionA = cantidadA.botellas > 0 || cantidadA.cajas > 0;
		const tieneSeleccionB = cantidadB.botellas > 0 || cantidadB.cajas > 0;
		
		// If one has selection and the other doesn't, the one with selection goes first
		if (tieneSeleccionA && !tieneSeleccionB) return -1;
		if (!tieneSeleccionA && tieneSeleccionB) return 1;
		
		// If both have or don't have selection, maintain alphabetical order by name
		return a.name.localeCompare(b.name);
	});

	return (
		<div className="min-h-screen bg-background text-primary">
			{/* Header */}
			<header className="border-b border-border bg-gradient-to-r from-background to-cardBg backdrop-blur-sm">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<div className="flex items-center gap-3 mb-3 lg:mb-4">
						<div className="w-2 h-2 lg:w-3 lg:h-3 bg-accent rounded-full"></div>
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-accent tracking-wide">
							<span className="block sm:inline">Encore Beverage</span>
							<span className="block sm:inline sm:ml-2">Ledger</span>
						</h1>
					</div>
					<p className="text-secondary/80 text-sm sm:text-base lg:text-lg font-light ml-5 lg:ml-7">
						Liquor inventory management for Encore Boston Harbor
					</p>
				</div>
			</header>

			{/* Navigation Bar */}
			<nav className="border-b border-border bg-cardBg/50 backdrop-blur-sm sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex">
						<button
							onClick={() => setActiveSection('seleccion')}
							className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
								activeSection === 'seleccion'
									? 'text-accent border-accent'
									: 'text-secondary/60 border-transparent hover:text-secondary hover:border-secondary/30'
							}`}
						>
							Liquor Selection
						</button>
						<button
							onClick={() => setActiveSection('historial')}
							className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
								activeSection === 'historial'
									? 'text-accent border-accent'
									: 'text-secondary/60 border-transparent hover:text-secondary hover:border-secondary/30'
							}`}
						>
							Movement History
						</button>
						<button
							onClick={() => setActiveSection('estadisticas')}
							className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
								activeSection === 'estadisticas'
									? 'text-accent border-accent'
									: 'text-secondary/60 border-transparent hover:text-secondary hover:border-secondary/30'
							}`}
						>
							Statistics
						</button>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
				{activeSection === 'seleccion' ? (
					<>
						{/* Search Bar */}
						<div className="mb-6 lg:mb-8">
							<div className="relative max-w-full sm:max-w-md">
								<input
									type="text"
									placeholder="Search by name or type..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary placeholder-placeholder focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
						/>
						<div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
							{searchTerm ? (
								<button
									onClick={() => setSearchTerm("")}
									className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center text-accent transition-colors"
									aria-label="Clear search"
								>
									×
								</button>
							) : (
								<div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-accent/40 rounded-full"></div>
							)}
						</div>
					</div>
					{searchTerm && (
						<div className="mt-2 text-xs sm:text-sm text-secondary/60">
							{licoresFiltrados.length} resultado{licoresFiltrados.length !== 1 ? 's' : ''} para "{searchTerm}"
						</div>
					)}
				</div>

				<section className="bg-cardBg/60 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-border/50 shadow-2xl">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 gap-2">
						<h2 className="text-xl sm:text-2xl font-light text-primary">Select liquors</h2>
						<div className="text-xs sm:text-sm text-secondary/60 font-light">
							{licoresOrdenados.length} of {licores.length} products {searchTerm ? 'found' : 'available'}
						</div>
					</div>
						<ul className="grid gap-4 sm:gap-6">
							{licoresOrdenados.length === 0 ? (
								<li className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
									{searchTerm ? `No liquors found for "${searchTerm}"` : 'No liquors registered.'}
								</li>
							) : (
								licoresOrdenados.map((licor) => {
									const cantidad = cantidades[licor.id] || { botellas: 0, cajas: 0 };
									const hasSelection = cantidad.botellas > 0 || cantidad.cajas > 0;
									return (
										<li
											key={licor.id}
											className={`group relative bg-gradient-to-r from-background/80 to-cardBg backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border transition-all duration-300 hover:shadow-xl ${
												hasSelection 
													? 'border-accent/50 shadow-accent/10 shadow-lg' 
													: 'border-border/30 hover:border-accent/30'
											}`}
										>
											{hasSelection && (
												<div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-pulse"></div>
											)}
											
											<div className="flex flex-col gap-4 sm:gap-6">
												{/* Licor Info */}
												<div className="flex-1">
													<h3 className="text-lg sm:text-xl lg:text-2xl font-light text-primary mb-2 group-hover:text-accent transition-colors">
														{licor.name}
													</h3>
													<div className="inline-flex items-center">
														<span className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium uppercase tracking-widest text-accent/80 bg-accent/10 rounded-full border border-accent/20 backdrop-blur-sm">
															{licor.type}
														</span>
													</div>
												</div>
												
												{/* Controls */}
												<div className="flex flex-col gap-3 sm:gap-4">
													{/* Bottles */}
													<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
														<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
															Bottles
														</label>
														<div className="flex items-center gap-2 sm:gap-3">
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30"
																onClick={() => handleChange(licor.id, "botellas", -1)}
																aria-label="Remove bottle"
																type="button"
															>
																−
															</button>
															<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
																{cantidad.botellas}
															</span>
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent hover:bg-accentHover text-background transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg shadow-lg hover:shadow-xl"
																onClick={() => handleChange(licor.id, "botellas", 1)}
																aria-label="Add bottle"
																type="button"
															>
																+
															</button>
														</div>
													</div>
													
													{/* Cases */}
													<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
														<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
															Cases
														</label>
														<div className="flex items-center gap-2 sm:gap-3">
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30"
																onClick={() => handleChange(licor.id, "cajas", -1)}
																aria-label="Remove case"
																type="button"
															>
																−
															</button>
															<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
																{cantidad.cajas}
															</span>
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent hover:bg-accentHover text-background transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg shadow-lg hover:shadow-xl"
																onClick={() => handleChange(licor.id, "cajas", 1)}
																aria-label="Add case"
																type="button"
															>
																+
															</button>
														</div>
													</div>
												</div>
											</div>
										</li>
									);
								})
							)}
						</ul>
						
						{/* Summary of Selected Items */}
						{Object.entries(cantidades).some(([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0) && (
							<div className="mt-6 lg:mt-8 p-4 sm:p-6 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
								<h3 className="text-lg sm:text-xl font-light text-primary mb-4">Selection Summary</h3>
								<div className="space-y-2">
									{Object.entries(cantidades)
										.filter(([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0)
										.map(([id, cantidad]) => {
											const licor = licores.find(l => l.id.toString() === id);
											const items = [];
											if (cantidad.botellas > 0) items.push(`${cantidad.botellas} bottle${cantidad.botellas > 1 ? 's' : ''}`);
											if (cantidad.cajas > 0) items.push(`${cantidad.cajas} case${cantidad.cajas > 1 ? 's' : ''}`);
											
											return (
												<div key={id} className="flex justify-between text-sm sm:text-base">
													<span className="text-secondary font-light">{licor?.name}</span>
													<span className="text-accent font-medium">{items.join(' + ')}</span>
												</div>
											);
										})
									}
								</div>
							</div>
						)}
						
						{/* Action Buttons */}
						<div className="mt-8 lg:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
							<button 
								onClick={handleCancelMovement}
								disabled={submitting}
								className="group flex items-center justify-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-secondary hover:text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-2 sm:order-1"
							>
								<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								<span>Cancel Movement</span>
							</button>
							<button 
								onClick={handleConfirmar}
								disabled={submitting}
								data-checkout-button
								className="group flex items-center justify-center gap-3 sm:gap-4 bg-accent hover:bg-accentHover text-background px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-1 sm:order-2"
							>
								<span>{submitting ? 'Processing...' : 'Confirm Movement'}</span>
								<div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-background rounded-full group-hover:scale-125 transition-transform"></div>
							</button>
						</div>
					</section>
					</>
				) : activeSection === 'historial' ? (
					<section className="space-y-6 lg:space-y-8">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 gap-2">
							<h2 className="text-xl sm:text-2xl font-light text-primary">Movement History</h2>
							<div className="text-xs sm:text-sm text-secondary/60 font-light">
								{movimientos.length} movement{movimientos.length !== 1 ? 's' : ''} recorded
							</div>
						</div>

						{loadingMovimientos ? (
							<div className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
								Loading movements...
							</div>
						) : movimientos.length === 0 ? (
							<div className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
								No movements recorded.
							</div>
						) : (
							<div className="grid gap-4 sm:gap-6">
								{movimientos.map((movimiento) => {
									const isExpanded = expandedMovements.has(movimiento.id);
									const hasMoreLiquors = movimiento.liquors.length > 3;
									const displayLiquors = isExpanded ? movimiento.liquors : movimiento.liquors.slice(0, 3);
									
									return (
										<div key={movimiento.id} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300">
											<div className="p-4 sm:p-6">
												<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
													<div className="flex-1 min-w-0">
														<h3 className="text-lg sm:text-xl font-medium text-accent truncate">
															Movement #{movimiento.id.slice(-8)}
														</h3>
														<div className="space-y-1">
															<span className="text-sm sm:text-base text-secondary/60 font-light block">
																{new Date(movimiento.date).toLocaleDateString('en-US', {
																	day: 'numeric',
																	month: 'long',
																	year: 'numeric',
																	hour: '2-digit',
																	minute: '2-digit'
																})}
															</span>
															<span className="text-xs sm:text-sm text-secondary/50 font-light">
																{movimiento.liquors.length} {movimiento.liquors.length === 1 ? 'item' : 'items'}
															</span>
														</div>
													</div>
													<button
														onClick={() => window.open(`/api/movimientos/${movimiento.id}/pdf`, '_blank')}
														className="group flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-background px-4 py-2.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl w-full sm:w-auto min-w-[100px] sm:min-w-[80px]"
														title="Download PDF Invoice"
													>
														<svg 
															className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
															fill="none" 
															stroke="currentColor" 
															viewBox="0 0 24 24"
														>
															<path 
																strokeLinecap="round" 
																strokeLinejoin="round" 
																strokeWidth={2.5} 
																d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
															/>
														</svg>
														<span className="font-medium">PDF</span>
													</button>
												</div>
												
												<div className="space-y-2 mt-4">
													<div 
														className={`transition-all duration-500 ease-in-out ${
															isExpanded ? 'max-h-none opacity-100' : 'max-h-[180px] opacity-100'
														} overflow-hidden`}
													>
														{displayLiquors.map((licor, index) => (
															<div key={`${movimiento.id}-${index}`} className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
																<div className="flex flex-col">
																	<span className="text-secondary font-medium">{licor.name}</span>
																	<span className="text-xs text-secondary/60">{licor.type}</span>
																</div>
																<span className="text-accent font-medium">
																	{licor.quantity} {getDisplayUnit(licor.unit, licor.quantity)}
																</span>
															</div>
														))}
													</div>
													
													{hasMoreLiquors && (
														<button
															onClick={() => toggleMovementExpansion(movimiento.id)}
															className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-lg transition-all duration-300 text-secondary/80 hover:text-accent text-sm font-medium group"
														>
															<span>
																{isExpanded 
																	? `Show less` 
																	: `Show ${movimiento.liquors.length - 3} more items`
																}
															</span>
															<svg 
																className={`w-4 h-4 transition-all duration-300 group-hover:scale-110 ${
																	isExpanded ? 'rotate-180' : 'rotate-0'
																}`}
																fill="none" 
																stroke="currentColor" 
																viewBox="0 0 24 24"
															>
																<path 
																	strokeLinecap="round" 
																	strokeLinejoin="round" 
																	strokeWidth={2} 
																	d="M19 9l-7 7-7-7" 
																/>
															</svg>
														</button>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</section>
				) : activeSection === 'estadisticas' ? (
					<section className="space-y-6 lg:space-y-8">
						{/* Statistics Header */}
						<div className="text-center">
							<h2 className="text-xl sm:text-2xl font-light text-primary">Statistics</h2>
							<p className="text-secondary/60 text-sm sm:text-base mt-2">Analyze liquor consumption patterns and trends</p>
						</div>

						{/* Filter Controls */}
						<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center">
							{/* Time Range Selector */}
							<div className="flex items-center gap-2">
								<span className="text-secondary/80 text-sm font-medium">Period:</span>
								<div className="flex bg-cardBg border border-border rounded-lg overflow-hidden">
									{(['week', 'month', 'year'] as const).map((range) => (
										<button
											key={range}
											onClick={() => setStatisticsTimeRange(range)}
											className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
												statisticsTimeRange === range
													? 'bg-accent text-background'
													: 'text-secondary/70 hover:text-secondary hover:bg-white/5'
											}`}
										>
											{range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
										</button>
									))}
								</div>
							</div>

							{/* View Type Selector */}
							<div className="flex items-center gap-2">
								<span className="text-secondary/80 text-sm font-medium">View:</span>
								<div className="flex bg-cardBg border border-border rounded-lg overflow-hidden">
									{(['liquor', 'type'] as const).map((view) => (
										<button
											key={view}
											onClick={() => setStatisticsView(view)}
											className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
												statisticsView === view
													? 'bg-accent text-background'
													: 'text-secondary/70 hover:text-secondary hover:bg-white/5'
											}`}
										>
											{view === 'liquor' ? 'By Liquor' : 'By Type'}
										</button>
									))}
								</div>
							</div>
						</div>

						{loadingStatistics ? (
							<div className="flex items-center justify-center py-12">
								<div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
							</div>
						) : statisticsData && statisticsData.length > 0 ? (
							<div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
								{/* Chart Section */}
								<div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
									<h3 className="text-lg font-medium text-accent mb-4">Most Requested {statisticsView === 'liquor' ? 'Liquors' : 'Types'}</h3>
									<div className="space-y-3">
										{statisticsData.slice(0, 10).map((item: any, index: number) => {
											const maxQuantity = statisticsData[0]?.quantity || 1;
											const percentage = (item.quantity / maxQuantity) * 100;
											
											return (
												<div key={item.name} className="relative">
													<div className="flex justify-between items-center mb-1">
														<span className="text-sm font-medium text-secondary truncate pr-2">{item.name}</span>
														<span className="text-xs text-accent font-medium">{item.quantity}</span>
													</div>
													<div className="w-full bg-white/10 rounded-full h-2">
														<div 
															className="bg-gradient-to-r from-accent to-accentHover h-2 rounded-full transition-all duration-1000 ease-out"
															style={{ width: `${percentage}%` }}
														></div>
													</div>
													{index < 3 && (
														<div className="absolute -left-2 top-0 w-1 h-8 bg-accent/20 rounded-full"></div>
													)}
												</div>
											);
										})}
									</div>
								</div>

								{/* Leaderboard Section */}
								<div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
									<h3 className="text-lg font-medium text-accent mb-4">Leaderboard</h3>
									<div className="space-y-2">
										{statisticsData.slice(0, 15).map((item: any, index: number) => (
											<div 
												key={item.name} 
												className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
													index < 3 
														? 'bg-accent/10 border border-accent/20' 
														: 'bg-white/5 hover:bg-white/10'
												}`}
											>
												<div className="flex items-center gap-3">
													<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
														index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
														index === 1 ? 'bg-gray-400/20 text-gray-300' :
														index === 2 ? 'bg-amber-600/20 text-amber-400' :
														'bg-white/10 text-secondary/60'
													}`}>
														{index + 1}
													</div>
													<span className="text-sm font-medium text-secondary truncate">{item.name}</span>
												</div>
												<div className="flex items-center gap-2">
													<span className="text-accent font-bold">{item.quantity}</span>
													<span className="text-xs text-secondary/60">
														{item.quantity === 1 ? 'unit' : 'units'}
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<p className="text-secondary/60">No data available for the selected period</p>
							</div>
						)}
					</section>
				) : null}
			</main>
			
			{/* Floating Go to Checkout Button - Only show in liquor selection mode, when items are selected, and when checkout is not visible */}
			{activeSection === 'seleccion' && hasSelectedItems && (
				<div 
					className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 transition-all duration-700 ease-out ${
						showScrollButton 
							? 'translate-y-0 opacity-100 scale-100' 
							: 'translate-y-16 opacity-0 scale-95 pointer-events-none'
					} ${
						!buttonHasAppeared ? 'animate-bounce' : ''
					}`}
					style={{
						transform: showScrollButton 
							? 'translateY(0px) scale(1)' 
							: 'translateY(64px) scale(0.95)',
						opacity: showScrollButton ? 1 : 0,
						visibility: showScrollButton ? 'visible' : 'hidden',
						animation: showScrollButton && !buttonHasAppeared ? 'bounce 1s ease-in-out 2' : 'none'
					}}
				>
					<button
						onClick={scrollToCheckout}
						className={`group flex items-center gap-2 sm:gap-3 bg-accent hover:bg-accentHover text-background px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-full font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base border-2 border-accent hover:border-accentHover backdrop-blur-sm transform hover:-translate-y-1 active:translate-y-0 ${
							showScrollButton && !buttonHasAppeared ? 'animate-pulse' : ''
						}`}
						aria-label="Go to checkout"
					>
						<span className="hidden sm:inline">Go to Checkout</span>
						<span className="sm:hidden">Checkout</span>
						<div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
							<svg 
								className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:scale-110 group-active:scale-90" 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path 
									strokeLinecap="round" 
									strokeLinejoin="round" 
									strokeWidth={2.5} 
									d="M19 14l-7 7m0 0l-7-7m7 7V3" 
								/>
							</svg>
						</div>
					</button>
				</div>
			)}

			{/* Confirmation Modal */}
			{showConfirmModal && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-gradient-to-br from-cardBg to-background border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
								<svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 className="text-xl font-medium text-primary">Confirm Movement</h3>
						</div>
						
						<p className="text-secondary/80 mb-6 leading-relaxed">
							Are you sure you want to confirm this liquor movement? This action will record the selected items in the system.
						</p>
						
						<div className="flex gap-3">
							<button
								onClick={() => setShowConfirmModal(false)}
								className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-secondary hover:text-primary rounded-lg font-medium transition-all duration-200"
							>
								Cancel
							</button>
							<button
								onClick={executeMovement}
								disabled={submitting}
								className="flex-1 px-4 py-2.5 bg-accent hover:bg-accentHover text-background rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{submitting ? 'Processing...' : 'Confirm'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Cancel Modal */}
			{showCancelModal && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-gradient-to-br from-cardBg to-background border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
								<svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h3 className="text-xl font-medium text-primary">Cancel Movement</h3>
						</div>
						
						<p className="text-secondary/80 mb-6 leading-relaxed">
							Are you sure you want to cancel this movement? All selected items will be cleared and cannot be recovered.
						</p>
						
						<div className="flex gap-3">
							<button
								onClick={() => setShowCancelModal(false)}
								className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-secondary hover:text-primary rounded-lg font-medium transition-all duration-200"
							>
								Keep Items
							</button>
							<button
								onClick={executeCancelMovement}
								className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-all duration-200"
							>
								Clear All
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Notifications */}
			<div className="fixed top-20 md:top-4 right-4 z-50 space-y-3 max-w-sm">
				{notifications.map((notification) => (
					<div
						key={notification.id}
						className={`
							relative p-4 rounded-xl shadow-2xl border backdrop-blur-sm
							animate-in slide-in-from-right-full duration-300
							${notification.type === 'success' 
								? 'bg-green-500/10 border-green-500/30 text-green-100' 
								: notification.type === 'error'
								? 'bg-red-500/10 border-red-500/30 text-red-100'
								: notification.type === 'warning'
								? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
								: 'bg-blue-500/10 border-blue-500/30 text-blue-100'
							}
						`}
					>
						<button
							onClick={() => removeNotification(notification.id)}
							className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
						>
							<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						
						<div className="flex items-start gap-3 pr-6">
							<div className={`
								w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
								${notification.type === 'success' 
									? 'bg-green-500/20' 
									: notification.type === 'error'
									? 'bg-red-500/20'
									: notification.type === 'warning'
									? 'bg-amber-500/20'
									: 'bg-blue-500/20'
								}
							`}>
								{notification.type === 'success' && (
									<svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
								)}
								{notification.type === 'error' && (
									<svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								)}
								{notification.type === 'warning' && (
									<svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
									</svg>
								)}
								{notification.type === 'info' && (
									<svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								)}
							</div>
							
							<div className="flex-1 min-w-0">
								<h4 className="font-medium text-sm mb-1">{notification.title}</h4>
								<p className="text-xs opacity-90 leading-relaxed">{notification.message}</p>
							</div>
						</div>
					</div>
				))}
			</div>
			</div>
		);
	}