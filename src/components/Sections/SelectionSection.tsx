import { useState, useEffect, useRef } from 'react';
import type { Licor } from '../../app/actions-licores';
import { QuantityMinusButton, QuantityPlusButton, FilterButton, ClearSearchButton, PrimaryButton, SecondaryButton, DropdownButton, DropdownItemButton, Button } from '../UI/Button';
import { AdvancedFilters } from '../Filters';

interface SelectionSectionProps {
	licores: Licor[];
	loadingLicores: boolean;
	cantidades: Record<string, { botellas: number; cajas: number }>;
	searchTerm: string;
	typeFilter: string;
	submitting: boolean;
	onQuantityChange: (id: string, type: 'botellas' | 'cajas', delta: number) => void;
	onSearchChange: (value: string) => void;
	onTypeFilterChange: (type: string) => void;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function SelectionSection({
	licores,
	loadingLicores,
	cantidades,
	searchTerm,
	typeFilter,
	submitting,
	onQuantityChange,
	onSearchChange,
	onTypeFilterChange,
	onConfirm,
	onCancel
}: SelectionSectionProps) {
	// Estado para controlar el dropdown personalizado
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isItemsPerPageDropdownOpen, setIsItemsPerPageDropdownOpen] = useState(false);
	
	// Estados para filtros avanzados
	const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
	const [brandFilter, setBrandFilter] = useState('');
	const [originFilter, setOriginFilter] = useState('');
	const [subcategoryFilter, setSubcategoryFilter] = useState('');
	const [ageFilter, setAgeFilter] = useState('');
	const [abvFilter, setAbvFilter] = useState('');
	
	// Dropdown states for advanced filters
	const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
	const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);
	const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
	const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);
	const [isAbvDropdownOpen, setIsAbvDropdownOpen] = useState(false);
	
	// Estado para rastrear scroll automático
	const [lastAddedLicorId, setLastAddedLicorId] = useState<string | null>(null);
	const licorRefs = useRef<Record<string, HTMLLIElement | null>>({});
	
	// Key para forzar re-render y re-animación de los elementos
	const [animationKey, setAnimationKey] = useState(0);
	// Estados de paginación
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(15);
	
	// Get unique types for the dropdown
	const uniqueTypes = Array.from(new Set(licores.map(licor => licor.type))).sort();
	
	// Get unique options for advanced filters
	const uniqueBrands = Array.from(new Set(licores.map(licor => licor.brand).filter(Boolean))).sort();
	const uniqueOrigins = Array.from(new Set(licores.map(licor => licor.origin).filter(Boolean))).sort();
	const uniqueSubcategories = Array.from(new Set(licores.map(licor => licor.subcategory).filter(Boolean))).sort();
	const uniqueAges = Array.from(new Set(licores.map(licor => licor.age).filter(Boolean))).sort();
	const uniqueAbvs = Array.from(new Set(licores.map(licor => licor.abv?.toString()).filter(Boolean))).sort((a, b) => parseFloat(a || '0') - parseFloat(b || '0'));

	// Effect to trigger re-animation when filters change
	useEffect(() => {
		setAnimationKey(prev => prev + 1);
		setCurrentPage(1); // Reset to first page when filters change
	}, [searchTerm, typeFilter, brandFilter, originFilter, subcategoryFilter, ageFilter, abvFilter]);

	// Filter liquors by all available filters
	const licoresFiltrados = licores.filter((licor) => {
		const searchLower = searchTerm.toLowerCase();
		const matchesSearch = licor.name.toLowerCase().includes(searchLower) ||
			licor.type.toLowerCase().includes(searchLower) ||
			(licor.brand && licor.brand.toLowerCase().includes(searchLower)) ||
			(licor.subcategory && licor.subcategory.toLowerCase().includes(searchLower)) ||
			(licor.origin && licor.origin.toLowerCase().includes(searchLower)) ||
			(licor.age && licor.age.toLowerCase().includes(searchLower));
		
		const matchesType = typeFilter === '' || licor.type === typeFilter;
		const matchesBrand = brandFilter === '' || licor.brand === brandFilter;
		const matchesOrigin = originFilter === '' || licor.origin === originFilter;
		const matchesSubcategory = subcategoryFilter === '' || licor.subcategory === subcategoryFilter;
		const matchesAge = ageFilter === '' || licor.age === ageFilter;
		const matchesAbv = abvFilter === '' || licor.abv?.toString() === abvFilter;
		
		return matchesSearch && matchesType && matchesBrand && matchesOrigin && 
			   matchesSubcategory && matchesAge && matchesAbv;
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

	// Pagination logic
	const totalPages = Math.ceil(licoresOrdenados.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentPageLicores = licoresOrdenados.slice(startIndex, endIndex);

	// Function to handle quantity change with auto-scroll
	const handleQuantityChange = (id: string, type: 'botellas' | 'cajas', delta: number) => {
		const currentCantidad = cantidades[id] || { botellas: 0, cajas: 0 };
		const currentValue = currentCantidad[type];
		
		// Only track if we're adding (delta > 0) and this is the first item being added
		if (delta > 0 && currentValue === 0) {
			setLastAddedLicorId(id);
		}
		
		// Call the original function
		onQuantityChange(id, type, delta);
	};

	// Effect to scroll to the last added licor
	useEffect(() => {
		if (lastAddedLicorId) {
			// Find which page contains this licor
			const licorIndex = licoresOrdenados.findIndex(licor => licor.id === lastAddedLicorId);
			if (licorIndex !== -1) {
				const targetPage = Math.floor(licorIndex / itemsPerPage) + 1;
				
				// If we need to change page, do it first
				if (targetPage !== currentPage) {
					setCurrentPage(targetPage);
					// The scroll will happen after the page change in the next effect
					return;
				}
				
				// Scroll to the element
				const element = licorRefs.current[lastAddedLicorId];
				if (element) {
					element.scrollIntoView({ 
						behavior: 'smooth', 
						block: 'center' 
					});
				}
			}
			
			// Clear the tracking after a short delay
			const timer = setTimeout(() => {
				setLastAddedLicorId(null);
			}, 1000);
			
			return () => clearTimeout(timer);
		}
	}, [lastAddedLicorId, licoresOrdenados, currentPage, itemsPerPage]);

	// Helper functions for advanced filters
	const hasAdvancedFilters = brandFilter || originFilter || subcategoryFilter || ageFilter || abvFilter;
	
	const clearAdvancedFilters = () => {
		setBrandFilter('');
		setOriginFilter('');
		setSubcategoryFilter('');
		setAgeFilter('');
		setAbvFilter('');
	};
	
	const clearAllFilters = () => {
		onSearchChange('');
		onTypeFilterChange('');
		clearAdvancedFilters();
		setIsDropdownOpen(false);
		setIsAdvancedFiltersOpen(false);
	};

	// Calculate totals
	const totalBottles = Object.values(cantidades).reduce((sum, cantidad) => sum + cantidad.botellas, 0);
	const totalCases = Object.values(cantidades).reduce((sum, cantidad) => sum + cantidad.cajas, 0);
	const hasSelectedItems = Object.values(cantidades).some(cantidad => cantidad.botellas > 0 || cantidad.cajas > 0);

	return (
		<section className="space-y-3 sm:space-y-4 lg:space-y-8">
			{/* Search and Filter Controls */}
			<div className="mb-4 sm:mb-6 lg:mb-8">
				{/* Search and Dropdown Row */}
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6">
					{/* Search Bar */}
					<div className="relative flex-1 max-w-full sm:max-w-md">
						<input
							type="text"
							placeholder="Search by name, brand, type, origin..."
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary placeholder-placeholder focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
						/>
						<div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
							{searchTerm ? (
								<ClearSearchButton
									onClick={() => onSearchChange('')}
									aria-label="Clear search"
								>
									×
								</ClearSearchButton>
							) : (
								<svg 
									className="w-4 h-4 sm:w-5 sm:h-5 text-accent/60" 
									fill="none" 
									stroke="currentColor" 
									viewBox="0 0 24 24"
								>
									<path 
										strokeLinecap="round" 
										strokeLinejoin="round" 
										strokeWidth={2} 
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
									/>
								</svg>
							)}
						</div>
					</div>

					{/* Type Filter Dropdown */}
					<div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
						{/* Dropdown Button */}
						<DropdownButton
							type="button"
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							size="md"
						>
							<span className={typeFilter ? 'text-primary' : 'text-secondary/80'}>
								{typeFilter || 'All Types'}
							</span>
							<svg 
								className={`w-4 h-4 sm:w-5 sm:h-5 text-accent/60 transition-transform duration-200 ${
									isDropdownOpen ? 'rotate-180' : ''
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
						</DropdownButton>

						{/* Dropdown Menu */}
						{isDropdownOpen && (
							<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg border border-border rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm z-[9999] max-h-48 sm:max-h-80 overflow-y-auto">
								{/* All Types Option */}
								<DropdownItemButton
									type="button"
									onClick={() => {
										onTypeFilterChange('');
										setIsDropdownOpen(false);
									}}
									isActive={!typeFilter}
									size="md"
								>
									All Types
								</DropdownItemButton>
								
								{/* Type Options */}
								{uniqueTypes.map((type) => (
									<DropdownItemButton
										key={type}
										type="button"
										onClick={() => {
											onTypeFilterChange(type);
											setIsDropdownOpen(false);
										}}
										isActive={typeFilter === type}
										size="md"
									>
										{type}
									</DropdownItemButton>
								))}
							</div>
						)}

						{/* Overlay para cerrar el dropdown */}
						{isDropdownOpen && (
							<div 
								className="fixed inset-0 z-[9998]" 
								onClick={() => setIsDropdownOpen(false)}
							/>
						)}
					</div>

					{/* Advanced Filters Button */}
					<div className="relative">
						<Button
							variant="secondary"
							onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
							className={`group flex items-center gap-2 !px-3 sm:!px-4 !py-3 sm:!py-4 !rounded-xl sm:!rounded-2xl !text-sm sm:!text-base !font-medium !transition-all !duration-200 ${
								hasAdvancedFilters 
									? '!bg-accent/20 !border-accent/50 !text-accent hover:!bg-accent/30' 
									: '!bg-white/5 hover:!bg-white/10 !border-white/10 hover:!border-white/20 !text-primary'
							}`}
							aria-label="Advanced filters"
						>
							<svg 
								className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path 
									strokeLinecap="round" 
									strokeLinejoin="round" 
									strokeWidth={2} 
									d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" 
								/>
							</svg>
							<span className="hidden sm:inline">Advanced</span>
							<svg 
								className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
									isAdvancedFiltersOpen ? 'rotate-180' : ''
								}`} 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</Button>
					</div>

					{/* Clear All Filters Button - Solo en desktop dentro del flex */}
					{(searchTerm || typeFilter || hasAdvancedFilters) && (
						<div className="hidden sm:flex items-center animate-fade-in-up">
							<Button
								variant="danger"
								onClick={clearAllFilters}
								className="group flex items-center gap-2 !px-3 sm:!px-4 !py-3 sm:!py-4 !bg-red-500/10 hover:!bg-red-500/20 !border !border-red-500/30 hover:!border-red-500/50 !rounded-xl sm:!rounded-2xl !text-red-400 hover:!text-red-300 !transition-all !duration-200 !text-sm sm:!text-base !font-medium"
								aria-label="Clear all filters"
							>
								<svg 
									className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" 
									fill="none" 
									stroke="currentColor" 
									viewBox="0 0 24 24"
								>
									<path 
										strokeLinecap="round" 
										strokeLinejoin="round" 
										strokeWidth={2} 
										d="M6 18L18 6M6 6l12 12" 
									/>
								</svg>
								<span>Clear filters</span>
							</Button>
						</div>
					)}
				</div>

				{/* Clear All Filters Button - Solo en móvil, centrado */}
				{(searchTerm || typeFilter || hasAdvancedFilters) && (
					<div className="flex sm:hidden justify-center mt-3 animate-fade-in-up">
						<Button
							variant="danger"
							onClick={clearAllFilters}
							className="group flex items-center gap-2 !px-4 !py-2.5 !bg-red-500/10 hover:!bg-red-500/20 !border !border-red-500/30 hover:!border-red-500/50 !rounded-lg !text-red-400 hover:!text-red-300 !transition-all !duration-200 !text-sm !font-medium"
							aria-label="Clear all filters"
						>
							<svg 
								className="w-4 h-4 transition-transform group-hover:scale-110" 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path 
									strokeLinecap="round" 
									strokeLinejoin="round" 
									strokeWidth={2} 
									d="M6 18L18 6M6 6l12 12" 
								/>
							</svg>
							<span>Clear filters</span>
						</Button>
					</div>
				)}
			</div>

			{/* Advanced Filters Section */}
			{isAdvancedFiltersOpen && (
				<AdvancedFilters
					brandFilter={brandFilter}
					setBrandFilter={setBrandFilter}
					originFilter={originFilter}
					setOriginFilter={setOriginFilter}
					subcategoryFilter={subcategoryFilter}
					setSubcategoryFilter={setSubcategoryFilter}
					ageFilter={ageFilter}
					setAgeFilter={setAgeFilter}
					abvFilter={abvFilter}
					setAbvFilter={setAbvFilter}
					isBrandDropdownOpen={isBrandDropdownOpen}
					setIsBrandDropdownOpen={setIsBrandDropdownOpen}
					isOriginDropdownOpen={isOriginDropdownOpen}
					setIsOriginDropdownOpen={setIsOriginDropdownOpen}
					isSubcategoryDropdownOpen={isSubcategoryDropdownOpen}
					setIsSubcategoryDropdownOpen={setIsSubcategoryDropdownOpen}
					isAgeDropdownOpen={isAgeDropdownOpen}
					setIsAgeDropdownOpen={setIsAgeDropdownOpen}
					isAbvDropdownOpen={isAbvDropdownOpen}
					setIsAbvDropdownOpen={setIsAbvDropdownOpen}
					uniqueBrands={uniqueBrands}
					uniqueOrigins={uniqueOrigins}
					uniqueSubcategories={uniqueSubcategories}
					uniqueAges={uniqueAges}
					uniqueAbvs={uniqueAbvs}
					clearAdvancedFilters={clearAdvancedFilters}
					hasAdvancedFilters={hasAdvancedFilters}
				/>
			)}

			<div className="bg-cardBg/60 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-8 border border-border/50 shadow-2xl">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 lg:mb-8 gap-2">
					<h2 className="text-xl sm:text-2xl font-light text-primary">Select liquors</h2>
					<div className="text-xs sm:text-sm text-secondary/60 font-light">
						<span className="transition-all duration-300">
							{licoresOrdenados.length} of {licores.length} products {(searchTerm || typeFilter) ? 'found' : 'available'}
						</span>
						{typeFilter && (
							<span className="ml-2 px-2 py-1 bg-accent/10 text-accent rounded-md text-xs animate-fade-in-up">
								{typeFilter}
							</span>
						)}
					</div>
				</div>
				<ul className="grid gap-2 sm:gap-4 lg:gap-6">
					{loadingLicores ? (
						<div className="flex items-center justify-center py-12 animate-fade-in-up">
							<div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
						</div>
					) : currentPageLicores.length === 0 ? (
						<li key={`no-results-${animationKey}`} className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
							<div>
								{(searchTerm || typeFilter) ? (
									<>
										No liquors found for {searchTerm && `"${searchTerm}"`}
										{searchTerm && typeFilter && ' in '}
										{typeFilter && `${typeFilter} type`}
									</>
								) : (
									'No liquors registered.'
								)}
							</div>
						</li>
					) : (
						currentPageLicores.map((licor, index) => {
							const cantidad = cantidades[licor.id] || { botellas: 0, cajas: 0 };
							const hasSelection = cantidad.botellas > 0 || cantidad.cajas > 0;
							return (
								<li
									key={`${licor.id}-${animationKey}`}
									ref={(el) => { licorRefs.current[licor.id] = el; }}
									className={`group relative bg-gradient-to-r from-background/80 to-cardBg backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-8 border transition-all duration-300 hover:shadow-xl animate-fade-in-up opacity-0 ${
										hasSelection 
											? 'border-accent/50 shadow-accent/10 shadow-lg' 
											: 'border-border/30 hover:border-accent/30'
									}`}
									style={{
										animationDelay: `${index * 80}ms`,
										animationFillMode: 'forwards'
									}}
								>
									{hasSelection && (
										<div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-pulse"></div>
									)}
									
									{/* Mobile layout: vertical stack */}
									<div className="flex flex-col gap-3 sm:gap-4 lg:hidden">
										{/* Licor Info */}
										<div className="flex-1">
											<h3 className="text-lg sm:text-xl font-light text-primary mb-2 group-hover:text-accent transition-colors">
												{licor.name}
											</h3>
											
											{/* Brand and details row */}
											<div className="flex flex-wrap items-center gap-2 mb-3">
												{licor.brand && (
													<span className="px-2 py-1 text-xs font-medium text-secondary/80 bg-secondary/10 rounded-md border border-secondary/20">
														{licor.brand}
													</span>
												)}
												{licor.subcategory && (
													<span className="px-2 py-1 text-xs font-medium text-accent/70 bg-accent/5 rounded-md border border-accent/15">
														{licor.subcategory}
													</span>
												)}
												{licor.age && (
													<span className="px-2 py-1 text-xs font-medium text-blue-400/80 bg-blue-400/10 rounded-md border border-blue-400/20">
														{licor.age}
													</span>
												)}
											</div>

											{/* ABV and Origin row */}
											<div className="flex flex-wrap items-center gap-3 mb-3">
												{licor.abv && (
													<div className="flex items-center gap-1.5 text-xs text-secondary/70">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
														</svg>
														<span>{licor.abv}% ABV</span>
													</div>
												)}
												{licor.origin && (
													<div className="flex items-center gap-1.5 text-xs text-secondary/70">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
														</svg>
														<span>{licor.origin}</span>
													</div>
												)}
											</div>

											{/* Type badge */}
											<div className="inline-flex items-center">
												<span className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium uppercase tracking-widest text-accent/80 bg-accent/10 rounded-full border border-accent/20 backdrop-blur-sm">
													{licor.type}
												</span>
											</div>
										</div>
										
										{/* Controls */}
										<div className="flex flex-col gap-2 sm:gap-3">
											{/* Bottles */}
											<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
												<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
													Bottles
												</label>
												<div className="flex items-center gap-2 sm:gap-3">
													<QuantityMinusButton
														onClick={() => handleQuantityChange(licor.id, "botellas", -1)}
														aria-label="Remove bottle"
														type="button"
													>
														−
													</QuantityMinusButton>
													<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
														{cantidad.botellas}
													</span>
													<QuantityPlusButton
														onClick={() => handleQuantityChange(licor.id, "botellas", 1)}
														aria-label="Add bottle"
														type="button"
													>
														+
													</QuantityPlusButton>
												</div>
											</div>
											
											{/* Cases */}
											<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
												<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
													Cases
												</label>
												<div className="flex items-center gap-2 sm:gap-3">
													<QuantityMinusButton
														onClick={() => handleQuantityChange(licor.id, "cajas", -1)}
														aria-label="Remove case"
														type="button"
													>
														−
													</QuantityMinusButton>
													<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
														{cantidad.cajas}
													</span>
													<QuantityPlusButton
														onClick={() => handleQuantityChange(licor.id, "cajas", 1)}
														aria-label="Add case"
														type="button"
													>
														+
													</QuantityPlusButton>
												</div>
											</div>
										</div>
									</div>

									{/* Desktop layout: horizontal with controls on the right */}
									<div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-8">
										{/* Licor Info - Left side */}
										<div className="flex-1">
											<h3 className="text-2xl font-light text-primary mb-2 group-hover:text-accent transition-colors">
												{licor.name}
											</h3>
											
											{/* Brand and details row */}
											<div className="flex flex-wrap items-center gap-2 mb-3">
												{licor.brand && (
													<span className="px-2 py-1 text-xs font-medium text-secondary/80 bg-secondary/10 rounded-md border border-secondary/20">
														{licor.brand}
													</span>
												)}
												{licor.subcategory && (
													<span className="px-2 py-1 text-xs font-medium text-accent/70 bg-accent/5 rounded-md border border-accent/15">
														{licor.subcategory}
													</span>
												)}
												{licor.age && (
													<span className="px-2 py-1 text-xs font-medium text-blue-400/80 bg-blue-400/10 rounded-md border border-blue-400/20">
														{licor.age}
													</span>
												)}
											</div>

											{/* ABV and Origin row */}
											<div className="flex flex-wrap items-center gap-3 mb-3">
												{licor.abv && (
													<div className="flex items-center gap-1.5 text-xs text-secondary/70">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
														</svg>
														<span>{licor.abv}% ABV</span>
													</div>
												)}
												{licor.origin && (
													<div className="flex items-center gap-1.5 text-xs text-secondary/70">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
														</svg>
														<span>{licor.origin}</span>
													</div>
												)}
											</div>

											{/* Type badge */}
											<div className="inline-flex items-center">
												<span className="px-4 py-2 text-xs font-medium uppercase tracking-widest text-accent/80 bg-accent/10 rounded-full border border-accent/20 backdrop-blur-sm">
													{licor.type}
												</span>
											</div>
										</div>
										
										{/* Controls - Right side */}
										<div className="flex flex-col gap-4 min-w-[300px]">
											{/* Bottles */}
											<div className="flex items-center justify-between bg-background/50 backdrop-blur-sm rounded-2xl px-6 py-4 border border-border/30">
												<label className="text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[80px]">
													Bottles
												</label>
												<div className="flex items-center gap-3">
													<QuantityMinusButton
														onClick={() => handleQuantityChange(licor.id, "botellas", -1)}
														aria-label="Remove bottle"
														type="button"
													>
														−
													</QuantityMinusButton>
													<span className="w-12 text-center font-light text-xl text-accent">
														{cantidad.botellas}
													</span>
													<QuantityPlusButton
														onClick={() => handleQuantityChange(licor.id, "botellas", 1)}
														aria-label="Add bottle"
														type="button"
													>
														+
													</QuantityPlusButton>
												</div>
											</div>
											
											{/* Cases */}
											<div className="flex items-center justify-between bg-background/50 backdrop-blur-sm rounded-2xl px-6 py-4 border border-border/30">
												<label className="text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[80px]">
													Cases
												</label>
												<div className="flex items-center gap-3">
													<QuantityMinusButton
														onClick={() => handleQuantityChange(licor.id, "cajas", -1)}
														aria-label="Remove case"
														type="button"
													>
														−
													</QuantityMinusButton>
													<span className="w-12 text-center font-light text-xl text-accent">
														{cantidad.cajas}
													</span>
													<QuantityPlusButton
														onClick={() => handleQuantityChange(licor.id, "cajas", 1)}
														aria-label="Add case"
														type="button"
													>
														+
													</QuantityPlusButton>
												</div>
											</div>
										</div>
									</div>
								</li>
							);
						})
					)}
				</ul>
				
				{/* Pagination Controls */}
				{totalPages > 1 && (
					<div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in-up">
						{/* Results Info */}
						<div className="text-sm text-secondary/70 order-2 sm:order-1">
							Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, licoresOrdenados.length)} of {licoresOrdenados.length} results
						</div>
						
						{/* Pagination Navigation */}
						<div className="flex items-center gap-2 order-1 sm:order-2">
							{/* Previous Button */}
							<Button
								variant="secondary"
								onClick={() => setCurrentPage(currentPage - 1)}
								disabled={currentPage === 1}
								className="!px-3 !py-2 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Previous
							</Button>
							
							{/* Page Numbers */}
							<div className="flex items-center gap-1">
								{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
									let pageNum;
									if (totalPages <= 5) {
										pageNum = i + 1;
									} else if (currentPage <= 3) {
										pageNum = i + 1;
									} else if (currentPage >= totalPages - 2) {
										pageNum = totalPages - 4 + i;
									} else {
										pageNum = currentPage - 2 + i;
									}
									
									return (
										<Button
											key={pageNum}
											variant={currentPage === pageNum ? "primary" : "secondary"}
											onClick={() => setCurrentPage(pageNum)}
											className="!px-3 !py-2 !text-sm !min-w-[40px]"
										>
											{pageNum}
										</Button>
									);
								})}
							</div>
							
							{/* Next Button */}
							<Button
								variant="secondary"
								onClick={() => setCurrentPage(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="!px-3 !py-2 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next
							</Button>
						</div>
						
						{/* Items per page selector */}
						<div className="flex items-center gap-2 text-sm text-secondary/70 order-3">
							<span>Items per page:</span>
							<div className="relative">
								<Button
									variant="secondary"
									onClick={() => setIsItemsPerPageDropdownOpen(!isItemsPerPageDropdownOpen)}
									className="group !px-3 !py-2 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-primary !transition-all !duration-200 !font-medium flex items-center gap-2 !min-w-[60px] justify-between"
									aria-label="Select items per page"
								>
									<span>{itemsPerPage}</span>
									<svg 
										className={`w-4 h-4 transition-transform duration-200 ${isItemsPerPageDropdownOpen ? 'rotate-180' : ''}`}
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</Button>

								{/* Dropdown Menu */}
								{isItemsPerPageDropdownOpen && (
									<div className="absolute top-full left-0 mt-2 bg-cardBg backdrop-blur-md border border-white/20 rounded-xl shadow-2xl z-[9999] min-w-[80px] overflow-hidden">
										{[10, 15, 25, 50].map((value) => (
											<button
												key={value}
												onClick={() => {
													setItemsPerPage(value);
													setCurrentPage(1);
													setIsItemsPerPageDropdownOpen(false);
												}}
												className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
													itemsPerPage === value 
														? 'bg-accent/20 text-accent font-medium' 
														: 'text-primary hover:text-accent'
												}`}
											>
												{value}
											</button>
										))}
									</div>
								)}

								{/* Overlay para cerrar el dropdown */}
								{isItemsPerPageDropdownOpen && (
									<div 
										className="fixed inset-0 z-[9998]" 
										onClick={() => setIsItemsPerPageDropdownOpen(false)}
									/>
								)}
							</div>
						</div>
					</div>
				)}
				
				{/* Summary of Selected Items */}
				{hasSelectedItems && (
					<div className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-6 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
						<h3 className="text-lg sm:text-xl font-light text-primary mb-4">Selection Summary</h3>
						
						{/* Detailed Breakdown */}
						<div className="space-y-2 mb-4">
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

						{/* Total Summary - Compact */}
						<div className="pt-3 border-t border-white/10">
							<div className="flex items-center justify-between text-sm">
								<span className="text-secondary/80 font-medium">Total:</span>
								<div className="flex items-center gap-4">
									<span className="text-accent font-semibold">
										{totalBottles} {totalBottles === 1 ? 'Bottle' : 'Bottles'}
									</span>
									<span className="text-secondary/60">•</span>
									<span className="text-accent font-semibold">
										{totalCases} {totalCases === 1 ? 'Case' : 'Cases'}
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
				
				{/* Action Buttons */}
				<div className="mt-4 sm:mt-6 lg:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
					<SecondaryButton 
						onClick={onCancel}
						disabled={submitting || !hasSelectedItems}
						className="group flex items-center justify-center gap-2 sm:gap-3 !px-6 sm:!px-8 !py-3 sm:!py-4 !bg-white/10 hover:!bg-white/20 !border !border-white/20 hover:!border-white/30 !text-secondary hover:!text-primary !rounded-xl sm:!rounded-2xl !font-medium !transition-all !duration-300 !shadow-lg hover:!shadow-xl hover:!scale-105 !text-sm sm:!text-base lg:!text-lg disabled:!opacity-50 disabled:!cursor-not-allowed disabled:!transform-none order-2 sm:order-1"
						leftIcon={
							<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						}
					>
						Cancel Movement
					</SecondaryButton>
					<PrimaryButton 
						onClick={onConfirm}
						disabled={submitting || !hasSelectedItems}
						data-checkout-button
						isLoading={submitting}
						className="group flex items-center justify-center gap-3 sm:gap-4 !px-6 sm:!px-8 !py-3 sm:!py-4 !bg-accent hover:!bg-accentHover !text-background !rounded-xl sm:!rounded-2xl !font-medium !transition-all !duration-300 !shadow-lg hover:!shadow-xl hover:!scale-105 !text-sm sm:!text-base lg:!text-lg disabled:!opacity-50 disabled:!cursor-not-allowed disabled:!transform-none order-1 sm:order-2"
						leftIcon={
							!submitting && (
								<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							)
						}
					>
						{submitting ? 'Processing...' : 'Confirm Movement'}
					</PrimaryButton>
				</div>
			</div>
		</section>
	);
}
