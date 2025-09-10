import type { Movimiento } from '../../app/actions';

interface MovementCardProps {
	movimiento: Movimiento;
	isExpanded: boolean;
	onToggleExpansion: (id: string) => void;
}

function getDisplayUnit(unit: 'bottle' | 'case', quantity: number) {
	if (unit === 'bottle') {
		return quantity === 1 ? 'bottle' : 'bottles';
	} else {
		return quantity === 1 ? 'case' : 'cases';
	}
}

export default function MovementCard({ movimiento, isExpanded, onToggleExpansion }: MovementCardProps) {
	const hasMoreLiquors = movimiento.liquors.length > 3;
	const displayLiquors = isExpanded ? movimiento.liquors : movimiento.liquors.slice(0, 3);

	const handlePDFDownload = () => {
		const formattedDate = new Date(movimiento.date).toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: 'numeric'
		});
		window.open(`/api/movimientos/${movimiento.id}/pdf?date=${encodeURIComponent(formattedDate)}`, '_blank');
	};

	return (
		<div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300">
			<div className="p-4 sm:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
					<div className="flex-1 min-w-0">
						<h3 className="text-lg sm:text-xl font-medium text-accent mb-1">
							Movement
						</h3>
						<div className="space-y-1">
							<span className="text-xs sm:text-sm text-primary font-mono bg-white/5 px-2 py-1 rounded border border-white/10 inline-block">
								{movimiento.id}
							</span>
							<div className="text-sm sm:text-base text-secondary/60 font-light">
								{new Date(movimiento.date).toLocaleDateString('en-US', {
									day: 'numeric',
									month: 'long',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</div>
							<div className="text-xs sm:text-sm text-secondary/50 font-light">
								{movimiento.liquors.length} {movimiento.liquors.length === 1 ? 'item' : 'items'}
							</div>
						</div>
					</div>
					<button
						onClick={handlePDFDownload}
						className="group flex items-center justify-center gap-2 bg-accent hover:bg-accentHover text-background px-4 py-2.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl w-full sm:w-auto min-w-[100px] sm:min-w-[80px]"
						title="View PDF Invoice"
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
							<div key={`${movimiento.id}-${index}`} className="flex justify-between items-start py-3 border-b border-white/5 last:border-b-0">
								<div className="flex flex-col space-y-1 flex-1">
									<span className="text-secondary font-medium">{licor.name}</span>
									<span className="text-xs text-secondary/60">{licor.type}</span>
									{licor.brand && (
										<span className="text-xs text-accent/70">Brand: {licor.brand}</span>
									)}
									<div className="flex flex-wrap gap-2 text-xs text-secondary/50">
										{licor.origin && (
											<span>Origin: {licor.origin}</span>
										)}
										{licor.abv && (
											<span>ABV: {licor.abv}%</span>
										)}
										{licor.age && (
											<span>Age: {licor.age}</span>
										)}
										{licor.subcategory && (
											<span>Category: {licor.subcategory}</span>
										)}
									</div>
								</div>
								<span className="text-accent font-medium ml-4 text-right">
									{licor.quantity} {getDisplayUnit(licor.unit, licor.quantity)}
								</span>
							</div>
						))}
					</div>
					
					{hasMoreLiquors && (
						<button
							onClick={() => onToggleExpansion(movimiento.id)}
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
}
