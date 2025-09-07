import { useRef, useEffect } from 'react';

interface CalendarProps {
	dateFilter: string;
	showDatePicker: boolean;
	setDateFilter: (date: string) => void;
	setShowDatePicker: (show: boolean) => void;
}

export default function Calendar({ dateFilter, showDatePicker, setDateFilter, setShowDatePicker }: CalendarProps) {
	const datePickerRef = useRef<HTMLDivElement>(null);

	// Handle clicking outside to close calendar
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
				setShowDatePicker(false);
			}
		};

		if (showDatePicker) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showDatePicker, setShowDatePicker]);

	// Calendar helper functions
	const formatDateLocal = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const parseDate = (dateString: string) => {
		return dateString ? new Date(dateString + 'T00:00:00') : new Date();
	};

	const getDaysInMonth = (year: number, month: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (year: number, month: number) => {
		return new Date(year, month, 1).getDay();
	};

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const handleDateSelect = (date: string) => {
		setDateFilter(date);
		setShowDatePicker(false);
	};

	const clearDateFilter = () => {
		setDateFilter('');
		setShowDatePicker(false);
	};

	return (
		<div className="relative" ref={datePickerRef}>
			<button
				type="button"
				onClick={() => setShowDatePicker(!showDatePicker)}
				className={`w-full flex items-center justify-between px-4 py-3 bg-background/50 backdrop-blur-sm border rounded-xl transition-all duration-200 text-sm ${
					dateFilter 
						? 'border-accent/50 text-accent' 
						: 'border-white/20 text-secondary hover:border-accent/30 hover:text-accent'
				}`}
			>
				<div className="flex items-center gap-2">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span>{dateFilter ? new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					}) : 'Filter by date'}</span>
				</div>
				
				{dateFilter && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							clearDateFilter();
						}}
						className="ml-2 p-1 hover:bg-accent/20 rounded-lg transition-colors"
						title="Clear date filter"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				)}
			</button>

			{/* Calendar dropdown */}
			{showDatePicker && (
				<div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 p-4">
					{(() => {
						const today = new Date();
						const currentDate = dateFilter ? parseDate(dateFilter) : today;
						const year = currentDate.getFullYear();
						const month = currentDate.getMonth();
						const daysInMonth = getDaysInMonth(year, month);
						const firstDay = getFirstDayOfMonth(year, month);
						
						const prevMonth = () => {
							const newDate = new Date(year, month - 1, 1);
							const newDateString = formatDateLocal(newDate);
							setDateFilter(newDateString);
						};
						
						const nextMonth = () => {
							const newDate = new Date(year, month + 1, 1);
							const newDateString = formatDateLocal(newDate);
							setDateFilter(newDateString);
						};

						return (
							<div className="space-y-4">
								{/* Header */}
								<div className="flex items-center justify-between">
									<button
										onClick={prevMonth}
										className="p-2 hover:bg-white/10 rounded-lg transition-colors"
									>
										<svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
									</button>
									<h3 className="text-accent font-medium">
										{monthNames[month]} {year}
									</h3>
									<button
										onClick={nextMonth}
										className="p-2 hover:bg-white/10 rounded-lg transition-colors"
									>
										<svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
									</button>
								</div>

								{/* Days of week */}
								<div className="grid grid-cols-7 gap-1 text-xs text-secondary/60 font-medium">
									{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
										<div key={day} className="p-2 text-center">
											{day}
										</div>
									))}
								</div>

								{/* Calendar grid */}
								<div className="grid grid-cols-7 gap-1">
									{/* Empty cells for days before month starts */}
									{Array.from({ length: firstDay }, (_, i) => (
										<div key={`empty-${i}`} className="p-2"></div>
									))}
									
									{/* Days of the month */}
									{Array.from({ length: daysInMonth }, (_, i) => {
										const day = i + 1;
										const dateStr = formatDateLocal(new Date(year, month, day));
										const isSelected = dateFilter === dateStr;
										const isToday = formatDateLocal(today) === dateStr;
										
										return (
											<button
												key={day}
												onClick={() => handleDateSelect(dateStr)}
												className={`p-2 text-sm rounded-lg transition-all duration-200 hover:bg-accent/20 ${
													isSelected 
														? 'bg-accent text-background font-medium' 
														: isToday 
															? 'bg-white/10 text-accent font-medium' 
															: 'text-secondary hover:text-accent'
												}`}
											>
												{day}
											</button>
										);
									})}
								</div>
							</div>
						);
					})()}
				</div>
			)}
		</div>
	);
}
