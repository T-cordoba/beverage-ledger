interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	totalItems: number;
	totalQuantity: number;
	submitting: boolean;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, totalItems, totalQuantity, submitting }: ConfirmModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-gradient-to-br from-cardBg to-background border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
				<div className="text-center">
					<div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
						<svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-xl sm:text-2xl font-medium text-primary mb-3">Confirm Registration</h3>
					<p className="text-secondary/80 mb-6 leading-relaxed">
						Are you sure you want to register this movement with <span className="font-medium text-accent">{totalItems} liquor{totalItems !== 1 ? 's' : ''}</span> and <span className="font-medium text-accent">{totalQuantity} total item{totalQuantity !== 1 ? 's' : ''}</span>?
					</p>
					<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
						<button
							onClick={onClose}
							disabled={submitting}
							className="flex-1 px-6 py-3 bg-border/50 hover:bg-border text-secondary hover:text-primary rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Go Back
						</button>
						<button
							onClick={onConfirm}
							disabled={submitting}
							className="flex-1 px-6 py-3 bg-accent hover:bg-accentHover text-background rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{submitting ? (
								<>
									<div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
									<span>Registering...</span>
								</>
							) : (
								'Confirm'
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
