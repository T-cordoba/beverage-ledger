interface NavigationProps {
	activeSection: 'seleccion' | 'historial' | 'estadisticas';
	onSectionChange: (section: 'seleccion' | 'historial' | 'estadisticas') => void;
}

export default function Navigation({ activeSection, onSectionChange }: NavigationProps) {
	return (
		<nav className="border-b border-border bg-cardBg/50 backdrop-blur-sm sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex">
					<button
						onClick={() => onSectionChange('seleccion')}
						className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
							activeSection === 'seleccion'
								? 'text-accent border-accent'
								: 'text-secondary/60 border-transparent hover:text-secondary hover:border-secondary/30'
						}`}
					>
						Liquor Selection
					</button>
					<button
						onClick={() => onSectionChange('historial')}
						className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
							activeSection === 'historial'
								? 'text-accent border-accent'
								: 'text-secondary/60 border-transparent hover:text-secondary hover:border-secondary/30'
						}`}
					>
						Movement History
					</button>
					<button
						onClick={() => onSectionChange('estadisticas')}
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
	);
}
