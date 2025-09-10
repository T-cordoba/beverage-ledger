import React from 'react';
import { Button } from '../UI/Button';

interface AdvancedFiltersProps {
	// Single filter states (used in the actual implementation)
	brandFilter: string;
	setBrandFilter: (brand: string) => void;
	originFilter: string;
	setOriginFilter: (origin: string) => void;
	subcategoryFilter: string;
	setSubcategoryFilter: (category: string) => void;
	ageFilter: string;
	setAgeFilter: (age: string) => void;
	abvRange: { min: number; max: number };
	setAbvRange: (range: { min: number; max: number } | ((prev: { min: number; max: number }) => { min: number; max: number })) => void;
	
	// Dropdown states
	isBrandDropdownOpen: boolean;
	setIsBrandDropdownOpen: (open: boolean) => void;
	isOriginDropdownOpen: boolean;
	setIsOriginDropdownOpen: (open: boolean) => void;
	isSubcategoryDropdownOpen: boolean;
	setIsSubcategoryDropdownOpen: (open: boolean) => void;
	isAgeDropdownOpen: boolean;
	setIsAgeDropdownOpen: (open: boolean) => void;
	
	// Available options
	uniqueBrands: (string | undefined)[];
	uniqueOrigins: (string | undefined)[];
	uniqueSubcategories: (string | undefined)[];
	uniqueAges: (string | undefined)[];
	
	// Functions
	clearAdvancedFilters: () => void;
	hasAdvancedFilters: boolean | string;
}

export default function AdvancedFilters({
	brandFilter,
	setBrandFilter,
	originFilter,
	setOriginFilter,
	subcategoryFilter,
	setSubcategoryFilter,
	ageFilter,
	setAgeFilter,
	abvRange,
	setAbvRange,
	isBrandDropdownOpen,
	setIsBrandDropdownOpen,
	isOriginDropdownOpen,
	setIsOriginDropdownOpen,
	isSubcategoryDropdownOpen,
	setIsSubcategoryDropdownOpen,
	isAgeDropdownOpen,
	setIsAgeDropdownOpen,
	uniqueBrands,
	uniqueOrigins,
	uniqueSubcategories,
	uniqueAges,
	clearAdvancedFilters,
	hasAdvancedFilters,
}: AdvancedFiltersProps) {
	return (
		<div className="bg-cardBg/40 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border/30 shadow-lg animate-fade-in-up relative z-[110]">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
				{/* Brand Filter */}
				<div className="relative z-[114]">
					<label className="block text-xs font-medium text-secondary/70 mb-2 uppercase tracking-wider">Brand</label>
					<Button
						variant="secondary"
						onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
						className="w-full group !px-3 !py-2.5 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-primary !transition-all !duration-200 !font-medium flex items-center justify-between"
					>
						<span className={brandFilter ? 'text-primary' : 'text-secondary/60'}>
							{brandFilter || 'All Brands'}
						</span>
						<svg className={`w-4 h-4 transition-transform duration-200 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</Button>
					
					{isBrandDropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-[124] max-h-48 overflow-y-auto">
							<button
								onClick={() => {
									setBrandFilter('');
									setIsBrandDropdownOpen(false);
								}}
								className="w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 text-secondary/60"
							>
								All Brands
							</button>
							{uniqueBrands.filter(Boolean).map((brand) => (
								<button
									key={brand}
									onClick={() => {
										setBrandFilter(brand || '');
										setIsBrandDropdownOpen(false);
									}}
									className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
										brandFilter === brand ? 'bg-accent/20 text-accent font-medium' : 'text-primary hover:text-accent'
									}`}
								>
									{brand}
								</button>
							))}
						</div>
					)}
					
					{isBrandDropdownOpen && (
						<div className="fixed inset-0 z-[115]" onClick={() => setIsBrandDropdownOpen(false)} />
					)}
				</div>

				{/* Origin Filter */}
				<div className="relative z-[113]">
					<label className="block text-xs font-medium text-secondary/70 mb-2 uppercase tracking-wider">Origin</label>
					<Button
						variant="secondary"
						onClick={() => setIsOriginDropdownOpen(!isOriginDropdownOpen)}
						className="w-full group !px-3 !py-2.5 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-primary !transition-all !duration-200 !font-medium flex items-center justify-between"
					>
						<span className={originFilter ? 'text-primary' : 'text-secondary/60'}>
							{originFilter || 'All Origins'}
						</span>
						<svg className={`w-4 h-4 transition-transform duration-200 ${isOriginDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</Button>
					
					{isOriginDropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-[123] max-h-48 overflow-y-auto">
							<button
								onClick={() => {
									setOriginFilter('');
									setIsOriginDropdownOpen(false);
								}}
								className="w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 text-secondary/60"
							>
								All Origins
							</button>
							{uniqueOrigins.filter(Boolean).map((origin) => (
								<button
									key={origin}
									onClick={() => {
										setOriginFilter(origin || '');
										setIsOriginDropdownOpen(false);
									}}
									className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
										originFilter === origin ? 'bg-accent/20 text-accent font-medium' : 'text-primary hover:text-accent'
									}`}
								>
									{origin}
								</button>
							))}
						</div>
					)}
					
					{isOriginDropdownOpen && (
						<div className="fixed inset-0 z-[114]" onClick={() => setIsOriginDropdownOpen(false)} />
					)}
				</div>

				{/* Subcategory Filter */}
				<div className="relative z-[112]">
					<label className="block text-xs font-medium text-secondary/70 mb-2 uppercase tracking-wider">Category</label>
					<Button
						variant="secondary"
						onClick={() => setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen)}
						className="w-full group !px-3 !py-2.5 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-primary !transition-all !duration-200 !font-medium flex items-center justify-between"
					>
						<span className={subcategoryFilter ? 'text-primary' : 'text-secondary/60'}>
							{subcategoryFilter || 'All Categories'}
						</span>
						<svg className={`w-4 h-4 transition-transform duration-200 ${isSubcategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</Button>
					
					{isSubcategoryDropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-[122] max-h-48 overflow-y-auto">
							<button
								onClick={() => {
									setSubcategoryFilter('');
									setIsSubcategoryDropdownOpen(false);
								}}
								className="w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 text-secondary/60"
							>
								All Categories
							</button>
							{uniqueSubcategories.filter(Boolean).map((subcategory) => (
								<button
									key={subcategory}
									onClick={() => {
										setSubcategoryFilter(subcategory || '');
										setIsSubcategoryDropdownOpen(false);
									}}
									className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
										subcategoryFilter === subcategory ? 'bg-accent/20 text-accent font-medium' : 'text-primary hover:text-accent'
									}`}
								>
									{subcategory}
								</button>
							))}
						</div>
					)}
					
					{isSubcategoryDropdownOpen && (
						<div className="fixed inset-0 z-[113]" onClick={() => setIsSubcategoryDropdownOpen(false)} />
					)}
				</div>

				{/* Age Filter */}
				<div className="relative z-[111]">
					<label className="block text-xs font-medium text-secondary/70 mb-2 uppercase tracking-wider">Age</label>
					<Button
						variant="secondary"
						onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
						className="w-full group !px-3 !py-2.5 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-primary !transition-all !duration-200 !font-medium flex items-center justify-between"
					>
						<span className={ageFilter ? 'text-primary' : 'text-secondary/60'}>
							{ageFilter || 'All Ages'}
						</span>
						<svg className={`w-4 h-4 transition-transform duration-200 ${isAgeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</Button>
					
					{isAgeDropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-cardBg/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl z-[121] max-h-48 overflow-y-auto">
							<button
								onClick={() => {
									setAgeFilter('');
									setIsAgeDropdownOpen(false);
								}}
								className="w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 text-secondary/60"
							>
								All Ages
							</button>
							{uniqueAges.filter(Boolean).map((age) => (
								<button
									key={age}
									onClick={() => {
										setAgeFilter(age || '');
										setIsAgeDropdownOpen(false);
									}}
									className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 hover:bg-white/10 border-b border-white/10 last:border-b-0 ${
										ageFilter === age ? 'bg-accent/20 text-accent font-medium' : 'text-primary hover:text-accent'
									}`}
								>
									{age}
								</button>
							))}
						</div>
					)}
					
					{isAgeDropdownOpen && (
						<div className="fixed inset-0 z-[112]" onClick={() => setIsAgeDropdownOpen(false)} />
					)}
				</div>
			</div>

			{/* ABV Range Slider */}
			<div className="mb-4">
				<label className="block text-xs font-medium text-secondary/70 mb-2 uppercase tracking-wider">
					ABV Range: {abvRange.min}% - {abvRange.max}%
				</label>
				<div className="flex items-center gap-4">
					<span className="text-xs text-secondary/60 min-w-[30px]">0%</span>
					<div className="flex-1 relative">
						<input
							type="range"
							min="0"
							max="80"
							value={abvRange.min}
							onChange={(e) => setAbvRange(prev => ({ ...prev, min: Number(e.target.value) }))}
							className="absolute w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
							style={{ zIndex: 1 }}
						/>
						<input
							type="range"
							min="0"
							max="80"
							value={abvRange.max}
							onChange={(e) => setAbvRange(prev => ({ ...prev, max: Number(e.target.value) }))}
							className="absolute w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
							style={{ zIndex: 2 }}
						/>
						<div className="h-2 bg-white/10 rounded-lg relative">
							<div 
								className="absolute h-full bg-accent rounded-lg"
								style={{
									left: `${(abvRange.min / 80) * 100}%`,
									width: `${((abvRange.max - abvRange.min) / 80) * 100}%`
								}}
							/>
						</div>
					</div>
					<span className="text-xs text-secondary/60 min-w-[30px]">80%</span>
				</div>
			</div>

			{/* Advanced Filters Actions */}
			<div className="flex justify-end gap-3">
				<Button
					variant="secondary"
					onClick={clearAdvancedFilters}
					className="!px-4 !py-2 !text-sm !bg-white/5 hover:!bg-white/10 !border !border-white/10 hover:!border-white/20 !rounded-lg !text-secondary/70 hover:!text-primary"
					disabled={!Boolean(hasAdvancedFilters)}
				>
					Clear Advanced
				</Button>
			</div>
		</div>
	);
}
