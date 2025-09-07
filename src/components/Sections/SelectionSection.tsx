import { useState, useEffect } from 'react';
import type { Licor } from '../../app/actions-licores';

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
	// Key para forzar re-render y re-animación de los elementos
	const [animationKey, setAnimationKey] = useState(0);
	
	// Get unique types for the dropdown
	const uniqueTypes = Array.from(new Set(licores.map(licor => licor.type))).sort();

	// Effect to trigger re-animation when filters change
	useEffect(() => {
		setAnimationKey(prev => prev + 1);
	}, [searchTerm, typeFilter]);

	// Filter liquors by name, type, and selected type filter
	const licoresFiltrados = licores.filter((licor) => {
		const searchLower = searchTerm.toLowerCase();
		const matchesSearch = licor.name.toLowerCase().includes(searchLower) ||
			licor.type.toLowerCase().includes(searchLower);
		const matchesType = typeFilter === '' || licor.type === typeFilter;
		
		return matchesSearch && matchesType;
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
							placeholder="Search by name or type..."
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary placeholder-placeholder focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
						/>
						<div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
							{searchTerm ? (
								<button
									onClick={() => onSearchChange('')}
									className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center text-accent transition-colors"
									aria-label="Clear search"
								>
									×
								</button>
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
						<button
							type="button"
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base text-left flex items-center justify-between hover:border-accent/30"
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
						</button>

						{/* Dropdown Menu */}
						{isDropdownOpen && (
							<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg border border-border rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm z-50 overflow-hidden">
								{/* All Types Option */}
								<button
									type="button"
									onClick={() => {
										onTypeFilterChange('');
										setIsDropdownOpen(false);
									}}
									className={`w-full px-4 sm:px-6 py-3 text-left text-sm sm:text-base transition-all duration-200 hover:bg-accent/10 hover:text-accent border-b border-border/20 ${
										!typeFilter 
											? 'bg-accent/20 text-accent font-medium' 
											: 'text-secondary/80 hover:text-primary'
									}`}
								>
									All Types
								</button>
								
								{/* Type Options */}
								{uniqueTypes.map((type) => (
									<button
										key={type}
										type="button"
										onClick={() => {
											onTypeFilterChange(type);
											setIsDropdownOpen(false);
										}}
										className={`w-full px-4 sm:px-6 py-3 text-left text-sm sm:text-base transition-all duration-200 hover:bg-accent/10 hover:text-accent last:border-b-0 border-b border-border/20 ${
											typeFilter === type 
												? 'bg-accent/20 text-accent font-medium' 
												: 'text-primary hover:text-accent'
										}`}
									>
										{type}
									</button>
								))}
							</div>
						)}

						{/* Overlay para cerrar el dropdown */}
						{isDropdownOpen && (
							<div 
								className="fixed inset-0 z-40" 
								onClick={() => setIsDropdownOpen(false)}
							/>
						)}
					</div>

					{/* Clear All Filters Button - Solo en desktop dentro del flex */}
					{(searchTerm || typeFilter) && (
						<div className="hidden sm:flex items-center animate-fade-in-up">
							<button
								onClick={() => {
									onSearchChange('');
									onTypeFilterChange('');
									setIsDropdownOpen(false);
								}}
								className="group flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl sm:rounded-2xl text-red-400 hover:text-red-300 transition-all duration-200 text-sm sm:text-base font-medium"
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
							</button>
						</div>
					)}
				</div>

				{/* Clear All Filters Button - Solo en móvil, centrado */}
				{(searchTerm || typeFilter) && (
					<div className="flex sm:hidden justify-center mt-3 animate-fade-in-up">
						<button
							onClick={() => {
								onSearchChange('');
								onTypeFilterChange('');
								setIsDropdownOpen(false);
							}}
							className="group flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-all duration-200 text-sm font-medium"
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
						</button>
					</div>
				)}
			</div>

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
					) : licoresOrdenados.length === 0 ? (
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
						licoresOrdenados.map((licor, index) => {
							const cantidad = cantidades[licor.id] || { botellas: 0, cajas: 0 };
							const hasSelection = cantidad.botellas > 0 || cantidad.cajas > 0;
							return (
								<li
									key={`${licor.id}-${animationKey}`}
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
									
									<div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
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
										<div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
											{/* Bottles */}
											<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
												<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
													Bottles
												</label>
												<div className="flex items-center gap-2 sm:gap-3">
													<button
														className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30"
														onClick={() => onQuantityChange(licor.id, "botellas", -1)}
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
														onClick={() => onQuantityChange(licor.id, "botellas", 1)}
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
														onClick={() => onQuantityChange(licor.id, "cajas", -1)}
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
														onClick={() => onQuantityChange(licor.id, "cajas", 1)}
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
					<button 
						onClick={onCancel}
						disabled={submitting || !hasSelectedItems}
						className="group flex items-center justify-center gap-2 sm:gap-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-secondary hover:text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-2 sm:order-1"
					>
						<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
						<span>Cancel Movement</span>
					</button>
					<button 
						onClick={onConfirm}
						disabled={submitting || !hasSelectedItems}
						data-checkout-button
						className="group flex items-center justify-center gap-3 sm:gap-4 bg-accent hover:bg-accentHover text-background px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none order-1 sm:order-2"
					>
						<svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
						<span>{submitting ? 'Processing...' : 'Confirm Movement'}</span>
					</button>
				</div>
			</div>
		</section>
	);
}
