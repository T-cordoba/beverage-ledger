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
	const [activeSection, setActiveSection] = useState<'seleccion' | 'historial'>('seleccion');
	const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
	const [loadingMovimientos, setLoadingMovimientos] = useState(false);
	const [showScrollButton, setShowScrollButton] = useState(true);

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

	useEffect(() => {
		if (activeSection === 'historial') {
			loadMovimientos();
		}
	}, [activeSection]);

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
					setShowScrollButton(!isCheckoutVisible);
					
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
	}, [activeSection]);

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

	// Function to scroll to checkout section with improved animation for mobile and desktop
	const scrollToCheckout = () => {
		const checkoutButton = document.querySelector('[data-checkout-button]');
		if (checkoutButton) {
			// Get responsive offset based on screen size
			const isMobile = window.innerWidth < 768;
			const offset = isMobile ? 80 : 100; // Smaller offset for mobile
			
			// Get the position and add offset for better visual positioning
			const buttonRect = checkoutButton.getBoundingClientRect();
			const offsetTop = window.pageYOffset + buttonRect.top - offset;
			
			// Use smooth scrolling with fallback for older browsers
			if ('scrollBehavior' in document.documentElement.style) {
				window.scrollTo({
					top: offsetTop,
					behavior: 'smooth'
				});
			} else {
				// Fallback for older browsers with manual smooth scroll
				const startPosition = window.pageYOffset;
				const distance = offsetTop - startPosition;
				const duration = 500;
				let start: number | null = null;

				const step = (timestamp: number) => {
					if (!start) start = timestamp;
					const progress = timestamp - start;
					const progressPercentage = Math.min(progress / duration, 1);
					
					// Easing function for smooth animation
					const ease = progressPercentage < 0.5 
						? 2 * progressPercentage * progressPercentage 
						: 1 - Math.pow(-2 * progressPercentage + 2, 3) / 2;
					
					window.scrollTo(0, startPosition + distance * ease);
					
					if (progress < duration) {
						requestAnimationFrame(step);
					}
				};
				
				requestAnimationFrame(step);
			}
		}
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
			alert('You must select at least one liquor to confirm the movement.');
			return;
		}

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
			
			alert('Movement registered successfully');
		} catch (error) {
			console.error('Error creating movement:', error);
			alert('Error registering movement. Please try again.');
		} finally {
			setSubmitting(false);
		}
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
						
						{/* Floating Action Button */}
						<div className="mt-8 lg:mt-12 flex justify-center">
							<button 
								onClick={handleConfirmar}
								disabled={submitting}
								data-checkout-button
								className="group flex items-center gap-3 sm:gap-4 bg-accent hover:bg-accentHover text-background px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<span>{submitting ? 'Processing...' : 'Confirm Movement'}</span>
								<div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-background rounded-full group-hover:scale-125 transition-transform"></div>
							</button>
						</div>
					</section>
					</>
				) : (
					/* Movement History */
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
								{movimientos.map((movimiento) => (
									<div key={movimiento.id} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white/10 transition-all duration-300">
										<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
											<h3 className="text-lg sm:text-xl font-medium text-accent">
												Movement #{movimiento.id.slice(-8)}
											</h3>
											<span className="text-sm sm:text-base text-secondary/60 font-light">
												{new Date(movimiento.date).toLocaleDateString('en-US', {
													day: 'numeric',
													month: 'long',
													year: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
										</div>
										
										<div className="space-y-2">
											{movimiento.liquors.map((licor, index) => (
												<div key={index} className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
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
									</div>
								))}
							</div>
						)}
					</section>
				)}
			</main>
			
			{/* Floating Go to Checkout Button - Only show in liquor selection mode, when items are selected, and when checkout is not visible */}
			{activeSection === 'seleccion' && hasSelectedItems && showScrollButton && (
				<div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 transition-all duration-500 ease-in-out transform translate-y-0 opacity-100">
					<button
						onClick={scrollToCheckout}
						className="group flex items-center gap-2 sm:gap-3 bg-accent hover:bg-accentHover text-background px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-full font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base border-2 border-accent hover:border-accentHover backdrop-blur-sm transform hover:-translate-y-1 active:translate-y-0"
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
			</div>
		);
	}