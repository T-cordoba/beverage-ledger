import type { Movimiento } from '../../app/actions';
import MovementCard from '../MovementCard';
import Calendar from '../Calendar';

interface HistorySectionProps {
	movimientos: Movimiento[];
	loadingMovimientos: boolean;
	movementSearchTerm: string;
	dateFilter: string;
	showDatePicker: boolean;
	expandedMovements: Set<string>;
	onSearchChange: (value: string) => void;
	setDateFilter: (date: string) => void;
	setShowDatePicker: (show: boolean) => void;
	onToggleExpansion: (id: string) => void;
}

export default function HistorySection({
	movimientos,
	loadingMovimientos,
	movementSearchTerm,
	dateFilter,
	showDatePicker,
	expandedMovements,
	onSearchChange,
	setDateFilter,
	setShowDatePicker,
	onToggleExpansion
}: HistorySectionProps) {
	// Format date for display
	const formatDateLocal = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Filter movements by search term and date
	const filteredMovimientos = movimientos.filter(movimiento => {
		// Filter by movement ID
		const matchesCode = !movementSearchTerm || 
			movimiento.id.toLowerCase().includes(movementSearchTerm.toLowerCase());
		
		// Filter by date (using local date comparison)
		const matchesDate = !dateFilter || 
			formatDateLocal(new Date(movimiento.date)) === dateFilter;
		
		return matchesCode && matchesDate;
	});

	const filteredCount = filteredMovimientos.length;

	return (
		<section className="space-y-6 lg:space-y-8">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 gap-2">
				<h2 className="text-xl sm:text-2xl font-light text-primary">Movement History</h2>
				<div className="text-xs sm:text-sm text-secondary/60 font-light">
					{filteredCount} of {movimientos.length} movements {(movementSearchTerm || dateFilter) ? 'found' : 'total'}
				</div>
			</div>

			{/* Search and Filter Controls */}
			<div className="grid gap-4 sm:grid-cols-2">
				{/* Movement Search */}
				<div className="relative">
					<input
						type="text"
						placeholder="Search by movement code..."
						value={movementSearchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-white/20 rounded-xl text-secondary placeholder-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all duration-200 text-sm"
					/>
					<div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
						<svg className="w-4 h-4 text-secondary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				{/* Date Filter */}
				<Calendar 
					dateFilter={dateFilter}
					showDatePicker={showDatePicker}
					setDateFilter={setDateFilter}
					setShowDatePicker={setShowDatePicker}
				/>
			</div>
			
			{!movementSearchTerm && !dateFilter && (
				<p className="text-xs text-secondary/50">
					Search by movement code or filter by specific date
				</p>
			)}

			{loadingMovimientos ? (
				<div className="flex items-center justify-center py-12">
					<div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
				</div>
			) : movimientos.length === 0 ? (
				<div className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
					No movements recorded.
				</div>
			) : (
				<div className="grid gap-4 sm:gap-6">
					{filteredMovimientos.length === 0 && (movementSearchTerm || dateFilter) ? (
						<div className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
							{(() => {
								const searchInfo = [];
								if (movementSearchTerm) searchInfo.push(`"${movementSearchTerm}"`);
								if (dateFilter) {
									// Format date consistently with how it's displayed in the selector
									const formattedDate = new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-US', {
										day: 'numeric',
										month: 'long',
										year: 'numeric'
									});
									searchInfo.push(`date "${formattedDate}"`);
								}
								
								return `No movements found matching ${searchInfo.join(' and ')}.`;
							})()}
						</div>
					) : (
						filteredMovimientos.map((movimiento) => (
							<MovementCard
								key={movimiento.id}
								movimiento={movimiento}
								isExpanded={expandedMovements.has(movimiento.id)}
								onToggleExpansion={onToggleExpansion}
							/>
						))
					)}
				</div>
			)}
		</section>
	);
}
