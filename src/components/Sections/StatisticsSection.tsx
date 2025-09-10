type StatisticsData = { name: string; quantity: number };

import { FilterButton } from '../UI/Button';

interface StatisticsSectionProps {
	statisticsData: StatisticsData[];
	statisticsTimeRange: 'week' | 'month' | 'year';
	statisticsView: 'liquor' | 'type';
	loadingStatistics: boolean;
	onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
	onViewChange: (view: 'liquor' | 'type') => void;
}

export default function StatisticsSection({
	statisticsData,
	statisticsTimeRange,
	statisticsView,
	loadingStatistics,
	onTimeRangeChange,
	onViewChange
}: StatisticsSectionProps) {
	return (
		<section className="space-y-6 lg:space-y-8 w-full max-w-full overflow-hidden">
			{/* Statistics Header */}
			<div className="text-center">
				<h2 className="text-xl sm:text-2xl font-light text-primary">Statistics</h2>
				<p className="text-secondary/60 text-sm sm:text-base mt-2">Analyze liquor consumption patterns and trends</p>
			</div>

			{/* Filter Controls */}
			<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center px-4 sm:px-0">
				{/* Time Range Selector */}
				<div className="flex items-center gap-2 w-full sm:w-auto justify-center">
					<span className="text-secondary/80 text-sm font-medium flex-shrink-0">Period:</span>
					<div className="flex bg-cardBg border border-border rounded-lg overflow-hidden">
						{(['week', 'month', 'year'] as const).map((range) => (
							<FilterButton
								key={range}
								onClick={() => onTimeRangeChange(range)}
								isActive={statisticsTimeRange === range}
								size="sm"
								className="first:rounded-l-lg last:rounded-r-lg px-3 py-2"
							>
								{range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
							</FilterButton>
						))}
					</div>
				</div>

				{/* View Type Selector */}
				<div className="flex items-center gap-2 w-full sm:w-auto justify-center">
					<span className="text-secondary/80 text-sm font-medium flex-shrink-0">View:</span>
					<div className="flex bg-cardBg border border-border rounded-lg overflow-hidden">
						{(['liquor', 'type'] as const).map((view) => (
							<FilterButton
								key={view}
								onClick={() => onViewChange(view)}
								isActive={statisticsView === view}
								size="sm"
								className="first:rounded-l-lg last:rounded-r-lg px-3 py-2"
							>
								{view === 'liquor' ? 'By Liquor' : 'By Type'}
							</FilterButton>
						))}
					</div>
				</div>
			</div>

			{loadingStatistics ? (
				<div className="flex items-center justify-center py-12">
					<div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
				</div>
			) : statisticsData && statisticsData.length > 0 ? (
				<div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-2 w-full max-w-full overflow-hidden">
					{/* Chart Section */}
					<div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 min-w-0">
						<h3 className="text-lg font-medium text-accent mb-4">Most Requested {statisticsView === 'liquor' ? 'Liquors' : 'Types'}</h3>
						<div className="space-y-3">
							{statisticsData.slice(0, 10).map((item: StatisticsData, index: number) => {
								const maxQuantity = statisticsData[0]?.quantity || 1;
								const percentage = (item.quantity / maxQuantity) * 100;
								
								return (
									<div key={item.name} className="relative w-full min-w-0">
										<div className="flex justify-between items-center mb-1 gap-2 min-w-0">
											<span className="text-sm font-medium text-secondary truncate flex-1 min-w-0">{item.name}</span>
											<span className="text-xs text-accent font-medium flex-shrink-0">{item.quantity}</span>
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
					<div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 min-w-0">
						<h3 className="text-lg font-medium text-accent mb-4">Leaderboard</h3>
						<div className="space-y-2">
							{statisticsData.slice(0, 15).map((item: StatisticsData, index: number) => (
								<div 
									key={item.name} 
									className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-all duration-200 gap-2 min-w-0 ${
										index < 3 
											? 'bg-accent/10 border border-accent/20' 
											: 'bg-white/5 hover:bg-white/10'
									}`}
								>
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
											index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
											index === 1 ? 'bg-gray-400/20 text-gray-300' :
											index === 2 ? 'bg-amber-600/20 text-amber-400' :
											'bg-white/10 text-secondary/60'
										}`}>
											{index + 1}
										</div>
										<span className="text-sm font-medium text-secondary truncate min-w-0">{item.name}</span>
									</div>
									<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
										<span className="text-accent font-bold text-sm">{item.quantity}</span>
										<span className="text-xs text-secondary/60 hidden sm:inline">
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
	);
}
